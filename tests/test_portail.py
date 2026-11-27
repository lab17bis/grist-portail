"""Tests de bout en bout du portail : python3 tests/test_portail.py
Variables : CHROME (chemin du navigateur), URL (par défaut http://localhost:8784/).
Lancer d'abord un serveur : python3 -m http.server 8784
Les pages publiques des outils et le document Grist de configuration sont simulés : aucun appel réseau extérieur."""
import os, sys, json, re, base64
from playwright.sync_api import sync_playwright
URL = os.environ.get('URL', 'http://localhost:8784/')
ok = ko = 0
def verifier(nom, cond):
    global ok, ko
    print(('OK   ' if cond else 'ÉCHEC ') + nom); ok += bool(cond); ko += (not cond)
def enc(o): return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
CFG = {
    'page': {'marque': '', 'titre': 'Portail test', 'sousTitre': 'Pour voir', 'logo': {'src': 'data:image/svg+xml;base64,PHN2Zy8+', 'alt': 'Logo test', 'hauteur': 3}, 'pied': {'texte': 'Pied test', 'accessibilite': ''}},
    'accueil': {'titre': 'Bienvenue', 'texte': 'Premier paragraphe <b>sûr</b>.\n\nSecond paragraphe.'},
    'onglets': [
        {'titre': 'Carte', 'outil': 'carte', 'lien': 'https://grist.test/o/org/doc/DOC1', 'table': 'Lieux'},
        {'titre': 'Réunions', 'outil': 'reunion', 'lien': 'https://grist.test/doc/DOC1'},
        {'titre': 'Page libre', 'adresse': 'https://outil.test/p.html?public=1&doc=https%3A%2F%2Fgrist.test%2Fdoc%2FDOC1'},
        {'titre': 'Site inconnu', 'adresse': 'https://site-pirate.test/page.html'},
        {'titre': 'Cassée', 'outil': 'carte', 'lien': 'pas un lien'},
        {'titre': 'Dangereuse', 'adresse': 'javascript:alert(1)'},
    ]}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 860}); erreurs = []
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    # Les pages des outils sont remplacées par une page vide : on contrôle seulement l'adresse demandée.
    pg.route(re.compile(r'^https://(lab17bis\.github\.io|outil\.test)/'), lambda r: r.fulfill(status=200, content_type='text/html', body='<p>outil</p>'))
    pg.route(re.compile(r'^https://grist\.test/'), lambda r: r.abort())
    # config.json du portail : seul endroit où l'on autorise un autre site (outil.test).
    pg.route('**/config.json', lambda r: r.fulfill(status=200, content_type='application/json', body='{"hotesAutorises": ["outil.test"]}'))

    # 1. Configuration dans l'adresse
    pg.goto(URL + '?c=' + enc(CFG)); pg.wait_for_selector('.po-menu')
    verifier('titre et sous-titre', 'Portail test' in pg.locator('#entete').inner_text() and 'Pour voir' in pg.locator('#entete').inner_text())
    verifier('logo', pg.locator('#entete img').get_attribute('alt') == 'Logo test')
    verifier('pas de bloc-marque si vide', 'république' not in pg.locator('#entete').inner_text().lower())
    verifier('pied de page', 'Pied test' in pg.locator('#pied').inner_text())
    verifier('menu : accueil + 6 pages', pg.locator('.po-lien').count() == 7)
    verifier('accueil par défaut, texte échappé', pg.locator('h1').inner_text() == 'Bienvenue' and pg.locator('.po-accueil b').count() == 0 and '<b>sûr</b>' in pg.locator('.po-accueil').inner_text())
    pg.locator('.po-lien', has_text='Carte').click(); pg.wait_for_selector('iframe.po-cadre')
    src = pg.locator('iframe.po-cadre').get_attribute('src')
    verifier('carte : page publique de la carte, document, table, intégrée', src.startswith('https://lab17bis.github.io/grist-carte/v1/index.html?') and 'public=1' in src and 'doc=https%3A%2F%2Fgrist.test%2Fo%2Forg%2Fdoc%2FDOC1' in src and 'table=Lieux' in src and 'integre=1' in src)
    verifier('titre de l\'iframe', pg.locator('iframe.po-cadre').get_attribute('title') == 'Carte')
    verifier('iframe cloisonnée', 'allow-scripts' in pg.locator('iframe.po-cadre').get_attribute('sandbox') and 'allow-top-navigation' not in pg.locator('iframe.po-cadre').get_attribute('sandbox'))
    seul = pg.locator('.po-outils a').get_attribute('href')
    verifier('lien « ouvrir seule » sans intégration', 'integre' not in seul and seul.startswith('https://lab17bis.github.io/grist-carte/'))
    verifier('onglet courant signalé', pg.locator('.po-lien[aria-current=page]').inner_text() == 'Carte' and pg.url.endswith('#/carte'))
    verifier('hauteur de l\'iframe suffisante', pg.locator('iframe.po-cadre').evaluate('e => e.getBoundingClientRect().height') >= 600)
    pg.locator('.po-lien', has_text='Réunions').click(); pg.wait_for_function("document.querySelector('iframe').src.indexOf('public.html')>0")
    verifier('réunions : page public.html', 'grist-reunion/v1/public.html?' in pg.locator('iframe.po-cadre').get_attribute('src') and 'table=' not in pg.locator('iframe.po-cadre').get_attribute('src'))
    pg.locator('.po-lien', has_text='Page libre').click(); pg.wait_for_function("document.querySelector('iframe').src.indexOf('outil.test')>0")
    src = pg.locator('iframe.po-cadre').get_attribute('src')
    verifier('page libre : adresse conservée + integre=1', src.startswith('https://outil.test/p.html?') and 'public=1' in src and 'integre=1' in src)
    pg.locator('.po-lien', has_text='Cassée').click(); pg.wait_for_selector('.fr-alert--warning')
    verifier('page mal configurée : message, pas d\'iframe', pg.locator('iframe').count() == 0 and 'pas configurée' in pg.locator('.fr-alert--warning').inner_text())
    pg.locator('.po-lien', has_text='Dangereuse').click(); pg.wait_for_selector('.fr-alert--warning')
    verifier('adresse javascript: refusée', pg.locator('iframe').count() == 0)
    pg.locator('.po-lien', has_text='Site inconnu').click(); pg.wait_for_function("document.body.innerText.indexOf('pas autorisé')>0")
    verifier('site non autorisé : refusé, pas d\'iframe', pg.locator('iframe').count() == 0)
    pg.goto(URL + '?c=' + enc(dict(CFG, outils={'carte': 'https://site-pirate.test/carte.html'})) + '#/carte'); pg.wait_for_function("document.body.innerText.indexOf('pas autorisé')>0")
    verifier('page d\'outil détournée vers un site non autorisé : refusée', pg.locator('iframe').count() == 0)
    pg.goto(URL + '?c=' + enc(CFG) + '#/inconnu'); pg.wait_for_selector('.po-accueil')
    verifier('adresse de page inconnue : première page', pg.locator('h1').inner_text() == 'Bienvenue')

    # 2. Une seule page : pas de menu
    pg.goto(URL + '?c=' + enc({'page': {'titre': 'Seul'}, 'onglets': [{'titre': 'Graphe', 'outil': 'graphe', 'lien': 'https://grist.test/doc/DOC1', 'table': 'Liens'}]})); pg.wait_for_selector('iframe.po-cadre')
    verifier('une page : pas de menu', pg.locator('.po-menu').count() == 0)
    verifier('marque par défaut', 'république' in pg.locator('#entete').inner_text().lower())

    # 3. Configuration dans un document Grist
    tables = {'Portail_Onglets': {'cols': ['Titre', 'Outil', 'Lien', 'Table', 'Adresse', 'Options', 'Ordre', 'Actif'],
        'rows': [{'Titre': 'Deuxième', 'Outil': 'graphe', 'Lien': 'https://grist.test/doc/DOC1', 'Table': 'Liens', 'Ordre': 2, 'Actif': True},
                 {'Titre': 'Première', 'Outil': 'carte', 'Lien': 'https://grist.test/doc/DOC1', 'Table': 'Lieux', 'Options': '{"a":1}', 'Ordre': 1, 'Actif': True},
                 {'Titre': 'Masquée', 'Outil': 'carte', 'Lien': 'https://grist.test/doc/DOC1', 'Ordre': 3, 'Actif': False}],
        'cfg': {'page': {'titre': 'Portail Grist', 'marque': ''}}}}
    def h(route):
        path = route.request.url.split('/api/docs/DOC1', 1)[1]
        def rep(o): route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(o))
        m = re.match(r'/tables/(\w+)/(columns|records)', path)
        if not m or m.group(1) not in tables: return route.fulfill(status=404, headers={'access-control-allow-origin': '*'}, body='{}')
        t = tables[m.group(1)]
        if m.group(2) == 'columns': return rep({'columns': [{'id': c, 'fields': {'type': 'Text', 'description': json.dumps(t['cfg']) if c == 'Titre' and False else ('' if c != 'Config_portail' else json.dumps(t['cfg']))}} for c in t['cols'] + ['Config_portail']]})
        return rep({'records': [{'id': i + 1, 'fields': r} for i, r in enumerate(t['rows'])]})
    pg.route('**/api/docs/DOC1/**', h)
    pg.goto(URL + '?doc=https://grist.test/doc/DOC1'); pg.wait_for_selector('.po-menu')
    verifier('document Grist : titre venu de la colonne Config_portail', 'Portail Grist' in pg.locator('#entete').inner_text())
    verifier('document Grist : pages triées par ordre, page inactive absente', pg.locator('.po-lien').all_inner_texts() == ['Première', 'Deuxième'])
    verifier('document Grist : options transmises', 'config=' in pg.locator('iframe.po-cadre').get_attribute('src'))

    # 4. Erreurs
    pg.goto(URL + '?c=%%%'); pg.wait_for_selector('.fr-alert--error')
    verifier('configuration illisible : message', 'illisible' in pg.locator('.fr-alert--error').inner_text())
    pg.goto(URL); pg.wait_for_selector('.fr-callout')
    verifier('sans configuration : renvoi vers le générateur', pg.locator('.fr-callout a').get_attribute('href') == 'configurer.html')

    # 5. Générateur
    pg.goto(URL + 'configurer.html'); pg.wait_for_selector('#cf-onglets .pe-ligne')
    pg.fill('#cf-titre', 'Mon portail'); pg.fill('#cf-sous', 'Sous-titre'); pg.click('label[for=cf-marque]')
    pg.fill('#cf-o0-titre', 'Page A'); pg.fill('#cf-o0-adresse', 'https://outil.test/p.html?public=1&doc=x')
    pg.click('#cf-ajouter'); pg.fill('#cf-o1-titre', 'Page B'); pg.select_option('#cf-o1-mode', 'outil'); pg.wait_for_selector('#cf-o1-outil')
    pg.select_option('#cf-o1-outil', 'graphe'); pg.fill('#cf-o1-lien', 'https://grist.test/doc/DOC1'); pg.fill('#cf-o1-table', 'Liens')
    j = json.loads(pg.input_value('#cf-json'))
    verifier('générateur : JSON', j['page']['titre'] == 'Mon portail' and j['page']['marque'] == '' and len(j['onglets']) == 2 and j['onglets'][1] == {'titre': 'Page B', 'outil': 'graphe', 'lien': 'https://grist.test/doc/DOC1', 'table': 'Liens'})
    lien = pg.input_value('#cf-lien')
    pg.goto(lien); pg.wait_for_selector('.po-menu')
    verifier('générateur : le lien produit ouvre le portail', pg.locator('.po-lien').all_inner_texts() == ['Page A', 'Page B'] and 'Mon portail' in pg.locator('#entete').inner_text())
    pg.goto(URL + 'configurer.html?c=' + enc(CFG)); pg.wait_for_selector('#cf-onglets .pe-ligne')
    verifier('générateur : reprise d\'une configuration', pg.input_value('#cf-titre') == 'Portail test' and pg.locator('#cf-onglets .pe-ligne').count() == 6)
    pg.locator('[data-i="0"] [data-act=suppr]').click()
    verifier('générateur : suppression d\'une page', pg.locator('#cf-onglets .pe-ligne').count() == 5)
    pg.fill('#cf-json', '{pas du json'); pg.click('#cf-charger')
    verifier('générateur : JSON illisible signalé', 'illisible' in pg.inner_text('#cf-etat'))
    verifier('aucune erreur JavaScript', not erreurs)
    if erreurs: print(erreurs[:3])
    b.close()
print('\n%d réussis, %d échecs' % (ok, ko)); sys.exit(1 if ko else 0)
