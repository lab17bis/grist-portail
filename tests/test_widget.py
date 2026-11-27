"""Test « dans Grist » du configurateur du portail, avec une API Grist simulée (tests/grist-mock.js) chargée dans tests/hote.html.
Lancer un serveur dans v1 (python3 -m http.server PORT), puis : PORT=… python3 tests/test_widget.py"""
import os, json, re
from playwright.sync_api import sync_playwright
ok = ko = 0
def verifier(nom, cond):
    global ok, ko
    print(('OK   ' if cond else 'ÉCHEC ') + nom); ok += bool(cond); ko += (not cond)
def ouvrir(b, mock, erreurs):
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    mockjs = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grist-mock.js')).read()
    pg.route('https://docs.getgrist.com/grist-plugin-api.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mockjs))
    pg.route(re.compile(r'^https://(outil\.test|grist\.test)/'), lambda r: r.fulfill(status=200, content_type='text/html', body='<p>page</p>'))
    pg.goto(f'http://localhost:{os.environ.get("PORT", 8784)}/tests/hote.html')
    pg.evaluate('m => { window.MOCK = m; charger(); }', mock)
    return pg, pg.frame_locator('#w')
def onglet(f, n): return f.locator('.fr-segmented__element label', has_text=n).first
mock = lambda pg: pg.evaluate('window.MOCK')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
    erreurs = []
    m = {'tables': {'Table1': {'colonnes': {'A': {'type': 'Text'}}, 'lignes': []}}, 'table': 'Table1', 'utilisateur': {'email': 'a@exemple.fr', 'nom': 'A'}}
    pg, f = ouvrir(b, m, erreurs)
    f.locator('#po-installer').click()
    onglet(f, 'Pages').wait_for()
    d = mock(pg)['tables']
    verifier('installation : table Portail_Onglets et colonne Config_portail', 'Portail_Onglets' in d and 'Config_portail' in d['Portail_Onglets']['colonnes'])
    verifier('onglets communs : Portail, Pages, Aperçu, Publication', all(onglet(f, n).count() for n in ['Portail', 'Pages', 'Aperçu', 'Publication']))
    onglet(f, 'Pages').click()
    f.locator('#ac-titre').fill('Bienvenue'); f.locator('#ac-texte').fill('Premier paragraphe.')
    f.get_by_role('button', name='Ajouter une page').click()
    f.locator('#pg-titre-0').fill('Consultation'); f.locator('#pg-outil-0').select_option('consultation')
    f.locator('#pg-lien-0').fill('https://grist.test/o/org/doc/DOC1')
    f.get_by_role('button', name='Ajouter une page').click()
    f.locator('#pg-titre-1').fill('Vote'); f.locator('#pg-mode-1').select_option('adresse')
    f.locator('#pg-adresse-1').fill('https://lab17bis.github.io/grist-questionnaire/v1/formulaire.html?grist=x')
    f.get_by_role('button', name='Descendre').first.click()
    verifier('pages : ordre modifiable', f.locator('#pg-titre-0').input_value() == 'Vote')
    f.get_by_role('button', name='Enregistrer').first.click()
    pg.wait_for_timeout(800)
    t = mock(pg)['tables']['Portail_Onglets']
    lig = sorted(t['lignes'], key=lambda l: l.get('Ordre', 0))
    verifier('enregistrement : deux lignes dans l\'ordre choisi', [l['Titre'] for l in lig] == ['Vote', 'Consultation'] and [l['Ordre'] for l in lig] == [1, 2])
    verifier('enregistrement : outil, lien et adresse', lig[1]['Outil'] == 'consultation' and lig[1]['Lien'].endswith('DOC1') and lig[0]['Adresse'].startswith('https://lab17bis.github.io/'))
    cfg = json.loads(t['colonnes']['Config_portail']['description'])
    verifier('enregistrement : accueil dans Config_portail', cfg['accueil']['titre'] == 'Bienvenue')
    # Le portail affiché dans la vue reprend la configuration
    onglet(f, 'Portail').click()
    src = f.locator('iframe.po-cadre-vue').get_attribute('src')
    verifier('vue : le portail est affiché en mode intégré avec la configuration', 'integre=1' in src and '?c=' in src)
    cadre = f.frame_locator('iframe.po-cadre-vue')
    cadre.locator('nav.po-menu').wait_for()
    verifier('vue : menu Bienvenue, Vote, Consultation', cadre.locator('nav.po-menu a').all_inner_texts() == ['Bienvenue', 'Vote', 'Consultation'])
    # Publication : lien du portail construit
    onglet(f, 'Publication').click()
    f.locator('input.cl-code').first.fill('https://grist.numerique.gouv.fr/o/lab17bis/doc/ABC123')
    pg.wait_for_timeout(300)
    corps = f.locator('body').inner_text()
    verifier('publication : lien index.html?doc=…', 'index.html?doc=' in (f.locator('body').inner_html()) )
    # Rechargement : l'état revient
    doc = mock(pg)['tables']; pg.close()
    pg, f = ouvrir(b, dict(m, tables=doc), erreurs)
    onglet(f, 'Pages').click()
    verifier('rechargement : les pages sont relues', f.locator('#pg-titre-0').input_value() == 'Vote' and f.locator('#ac-titre').input_value() == 'Bienvenue')
    pg.close()
    verifier('aucune erreur JavaScript', not erreurs)
    b.close()
print(f'{ok} réussis, {ko} échoués')
raise SystemExit(1 if ko else 0)
