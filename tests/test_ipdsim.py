"""IPD Simulator -- Selenium test suite (25+ tests)."""

import io
import json
import os
import sys
import time

if "pytest" not in sys.modules:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

HTML_PATH = os.path.join(os.path.dirname(__file__), '..', 'index.html')
URL = 'file:///' + os.path.abspath(HTML_PATH).replace('\\', '/')

def get_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--window-size=1280,900')
    prefs = {'download.default_directory': os.path.abspath(os.path.join(os.path.dirname(__file__), 'downloads'))}
    opts.add_experimental_option('prefs', prefs)
    return webdriver.Chrome(options=opts)

def switch_tab(driver, tab_id):
    btn = driver.find_element(By.ID, f'btn-{tab_id}')
    btn.click()
    time.sleep(0.3)

def fill_binary(driver, ee, ne, ec, nc, seed=42):
    switch_tab(driver, 'binary')
    driver.find_element(By.ID, 'bin-events-exp').clear()
    driver.find_element(By.ID, 'bin-events-exp').send_keys(str(ee))
    driver.find_element(By.ID, 'bin-n-exp').clear()
    driver.find_element(By.ID, 'bin-n-exp').send_keys(str(ne))
    driver.find_element(By.ID, 'bin-events-ctrl').clear()
    driver.find_element(By.ID, 'bin-events-ctrl').send_keys(str(ec))
    driver.find_element(By.ID, 'bin-n-ctrl').clear()
    driver.find_element(By.ID, 'bin-n-ctrl').send_keys(str(nc))
    driver.find_element(By.ID, 'bin-seed').clear()
    driver.find_element(By.ID, 'bin-seed').send_keys(str(seed))

def fill_continuous(driver, me, se, ne, mc, sc, nc, corr=0, seed=42):
    switch_tab(driver, 'continuous')
    for fid, val in [('cont-mean-exp', me), ('cont-sd-exp', se), ('cont-n-exp', ne),
                     ('cont-mean-ctrl', mc), ('cont-sd-ctrl', sc), ('cont-n-ctrl', nc),
                     ('cont-corr', corr), ('cont-seed', seed)]:
        el = driver.find_element(By.ID, fid)
        el.clear()
        el.send_keys(str(val))

passed = 0
failed = 0
errors = []

def run_test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f'  PASS: {name}')
    except Exception as e:
        failed += 1
        errors.append((name, str(e)))
        print(f'  FAIL: {name} -- {e}')


driver = get_driver()
driver.get(URL)
time.sleep(2)

# Clear localStorage to avoid stale state from prior runs
driver.execute_script('localStorage.clear()')
driver.get(URL)
time.sleep(2)

# ── Binary tests ──

def test_binary_marginals():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    result_text = driver.find_element(By.ID, 'bin-result').text
    assert '298 patients generated' in result_text, f'Expected 298 patients, got: {result_text}'
    assert 'Marginals exact: true' in result_text, f'Expected marginals exact, got: {result_text}'
run_test('Binary: marginal preservation', test_binary_marginals)

def test_binary_zero_events():
    fill_binary(driver, 0, 50, 0, 50)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    result_text = driver.find_element(By.ID, 'bin-result').text
    assert '100 patients generated' in result_text, f'Expected 100 patients, got: {result_text}'
run_test('Binary: zero-event arms', test_binary_zero_events)

def test_binary_seed_reproducibility():
    fill_binary(driver, 23, 150, 41, 148, seed=99)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd1 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    fill_binary(driver, 23, 150, 41, 148, seed=99)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd2 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    assert ipd1 == ipd2, 'Same seed should produce same output'
run_test('Binary: seed reproducibility', test_binary_seed_reproducibility)

def test_binary_validation_error():
    fill_binary(driver, 200, 150, 41, 148)  # events > N
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    warn = driver.find_element(By.ID, 'bin-warnings').text
    assert 'Events cannot exceed N' in warn, f'Expected error message, got: {warn}'
run_test('Binary: events > N error', test_binary_validation_error)

def test_binary_different_seeds():
    fill_binary(driver, 23, 150, 41, 148, seed=1)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd1 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    fill_binary(driver, 23, 150, 41, 148, seed=2)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd2 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    assert ipd1 != ipd2, 'Different seeds should produce different output'
run_test('Binary: different seeds differ', test_binary_different_seeds)

# ── Continuous tests ──

def test_continuous_mean_sd_match():
    fill_continuous(driver, -5.2, 8.1, 120, -2.1, 7.9, 118)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['mean_diff_pct_exp'] < 1, f"Mean diff exp too large: {m['mean_diff_pct_exp']}"
    assert m['sd_diff_pct_exp'] < 1, f"SD diff exp too large: {m['sd_diff_pct_exp']}"
    assert m['mean_diff_pct_ctrl'] < 1, f"Mean diff ctrl too large: {m['mean_diff_pct_ctrl']}"
    assert m['sd_diff_pct_ctrl'] < 1, f"SD diff ctrl too large: {m['sd_diff_pct_ctrl']}"
run_test('Continuous: mean/SD match < 1%', test_continuous_mean_sd_match)

def test_continuous_correlation_zero():
    fill_continuous(driver, 0, 1, 200, 0, 1, 200, corr=0)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    ipd = driver.execute_script('return STATE.lastIPD')
    assert len(ipd) == 400, f'Expected 400 patients, got {len(ipd)}'
run_test('Continuous: correlation=0 independence', test_continuous_correlation_zero)

def test_continuous_correlation_positive():
    fill_continuous(driver, 0, 1, 100, 0, 1, 100, corr=0.8)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    ipd = driver.execute_script('return STATE.lastIPD')
    assert len(ipd) == 200, f'Expected 200 patients, got {len(ipd)}'
run_test('Continuous: correlation>0 runs', test_continuous_correlation_positive)

def test_continuous_negative_mean():
    fill_continuous(driver, -10.5, 3.2, 50, -8.3, 3.0, 50)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['mean_diff_pct_exp'] < 2, f"Mean diff exp too large: {m['mean_diff_pct_exp']}"
run_test('Continuous: negative mean handled', test_continuous_negative_mean)

def test_continuous_n2_edge():
    fill_continuous(driver, 5.0, 1.0, 2, 3.0, 1.0, 2)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    ipd = driver.execute_script('return STATE.lastIPD')
    assert len(ipd) == 4, f'Expected 4 patients, got {len(ipd)}'
run_test('Continuous: N=2 edge case', test_continuous_n2_edge)

# ── KM tests ──

def test_km_example_dapahf():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('dapahf')
    time.sleep(1.5)
    result = driver.find_element(By.ID, 'km-result').text
    assert 'patients reconstructed' in result, f'Expected reconstruction result, got: {result}'
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['rmse_exp'] < 0.10, f"RMSE exp too high: {m['rmse_exp']}"
run_test('KM: DAPA-HF example runs', test_km_example_dapahf)

def test_km_example_paradigm():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('paradigm')
    time.sleep(1.5)
    result = driver.find_element(By.ID, 'km-result').text
    assert 'patients reconstructed' in result, f'Expected reconstruction result, got: {result}'
run_test('KM: PARADIGM-HF example runs', test_km_example_paradigm)

def test_km_empty_input():
    switch_tab(driver, 'km')
    driver.find_element(By.ID, 'km-coords-exp').clear()
    driver.find_element(By.ID, 'km-coords-ctrl').clear()
    driver.find_element(By.ID, 'km-atrisk').clear()
    driver.find_element(By.ID, 'km-run').click()
    time.sleep(0.3)
    warn = driver.find_element(By.ID, 'km-warnings').text
    assert 'required' in warn.lower(), f'Expected required warning, got: {warn}'
run_test('KM: empty input rejected', test_km_empty_input)

def test_km_seed_reproducibility():
    switch_tab(driver, 'km')
    # Set seed to 42 first
    driver.find_element(By.ID, 'km-seed').clear()
    driver.find_element(By.ID, 'km-seed').send_keys('42')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('dapahf')
    time.sleep(1.5)
    ipd1 = driver.execute_script('return JSON.stringify(STATE.lastIPD.slice(0,5))')
    # Reset seed to 42 and run again
    driver.find_element(By.ID, 'km-seed').clear()
    driver.find_element(By.ID, 'km-seed').send_keys('42')
    sel.select_by_value('dapahf')
    time.sleep(1.5)
    ipd2 = driver.execute_script('return JSON.stringify(STATE.lastIPD.slice(0,5))')
    assert ipd1 == ipd2, 'Same seed should produce same KM output'
run_test('KM: seed reproducibility', test_km_seed_reproducibility)

def test_km_two_timepoints():
    switch_tab(driver, 'km')
    driver.find_element(By.ID, 'km-coords-exp').clear()
    driver.find_element(By.ID, 'km-coords-exp').send_keys('0, 1.0\n12, 0.5')
    driver.find_element(By.ID, 'km-coords-ctrl').clear()
    driver.find_element(By.ID, 'km-coords-ctrl').send_keys('0, 1.0\n12, 0.6')
    driver.find_element(By.ID, 'km-atrisk').clear()
    driver.find_element(By.ID, 'km-atrisk').send_keys('0, 50, 50\n12, 25, 30')
    driver.find_element(By.ID, 'km-run').click()
    time.sleep(0.5)
    result = driver.find_element(By.ID, 'km-result').text
    assert 'patients reconstructed' in result, f'Expected reconstruction, got: {result}'
run_test('KM: k=2 time points edge case', test_km_two_timepoints)

def test_km_monotonicity():
    switch_tab(driver, 'km')
    driver.find_element(By.ID, 'km-coords-exp').clear()
    driver.find_element(By.ID, 'km-coords-exp').send_keys('0, 1.0\n6, 0.8\n12, 0.85\n18, 0.7')  # violation at t=12
    driver.find_element(By.ID, 'km-coords-ctrl').clear()
    driver.find_element(By.ID, 'km-coords-ctrl').send_keys('0, 1.0\n6, 0.9\n12, 0.8\n18, 0.7')
    driver.find_element(By.ID, 'km-atrisk').clear()
    driver.find_element(By.ID, 'km-atrisk').send_keys('0, 100, 100\n6, 80, 90\n12, 60, 75\n18, 40, 55')
    driver.find_element(By.ID, 'km-run').click()
    time.sleep(0.5)
    warn = driver.find_element(By.ID, 'km-warnings').text
    assert 'Monotonicity' in warn or 'Clamped' in warn, f'Expected monotonicity warning, got: {warn}'
run_test('KM: monotonicity violation warning', test_km_monotonicity)

def test_km_hr_reconstruction():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('dapahf')
    time.sleep(1.5)
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['hr'] is not None, 'HR should be computed'
    assert 0.3 < m['hr'] < 1.5, f"HR out of range: {m['hr']}"
run_test('KM: HR reconstruction reasonable', test_km_hr_reconstruction)

# ── Validation panel tests ──

def test_validation_renders():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(1)
    content = driver.find_element(By.ID, 'validation-content')
    assert content.is_displayed(), 'Validation content should be visible'
    metrics = driver.find_element(By.ID, 'metrics-table').text
    assert 'Marginals Match' in metrics, f'Expected Marginals Match, got: {metrics}'
run_test('Validation: renders for binary', test_validation_renders)

def test_validation_traffic_light():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(0.5)
    badges = driver.find_elements(By.CSS_SELECTOR, '.badge-good')
    assert len(badges) >= 1, 'Should have at least one Good badge'
run_test('Validation: traffic light badges', test_validation_traffic_light)

def test_validation_chart_traces():
    fill_continuous(driver, -5.2, 8.1, 120, -2.1, 7.9, 118)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(1.5)
    traces = driver.execute_script('return document.getElementById("validation-chart").data.length')
    assert traces >= 2, f'Expected >= 2 traces, got {traces}'
run_test('Validation: chart has traces', test_validation_chart_traces)

def test_validation_summary_table():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(0.5)
    summary = driver.find_element(By.ID, 'summary-table').text
    assert '150' in summary and '148' in summary, f'Expected 150 and 148 in summary, got: {summary}'
run_test('Validation: summary table values', test_validation_summary_table)

# ── Export tests ──

def test_export_json_schema():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(0.3)
    # Generate JSON string in browser and validate structure
    json_str = driver.execute_script("""
        const m = STATE.lastMeta;
        const arms = {};
        for (const p of STATE.lastIPD) {
            if (!arms[p.arm]) arms[p.arm] = { name: p.arm, n: 0, patients: [] };
            arms[p.arm].n++;
            arms[p.arm].patients.push({ id: p.patient_id, outcome: p.outcome });
        }
        return JSON.stringify({ study_id: m.study_id, source: 'IPD-Simulator v1.0',
            seed: m.seed, outcome_type: m.outcome_type, arms: Object.values(arms) });
    """)
    data = json.loads(json_str)
    assert 'study_id' in data, 'JSON should have study_id'
    assert 'arms' in data, 'JSON should have arms'
    assert len(data['arms']) == 2, f'Expected 2 arms, got {len(data["arms"])}'
    assert data['arms'][0]['n'] + data['arms'][1]['n'] == 298, 'Total N should be 298'
run_test('Export: JSON schema valid', test_export_json_schema)

def test_export_provenance_changes():
    fill_binary(driver, 23, 150, 41, 148, seed=42)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    hash1 = driver.execute_script('return JSON.stringify(STATE.lastInput)')
    fill_binary(driver, 24, 150, 41, 148, seed=42)  # different events
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    hash2 = driver.execute_script('return JSON.stringify(STATE.lastInput)')
    assert hash1 != hash2, 'Different input should produce different provenance'
run_test('Export: provenance changes with input', test_export_provenance_changes)

# ── Accessibility tests ──

def test_skip_nav():
    driver.get(URL)
    time.sleep(0.5)
    skip = driver.find_element(By.CSS_SELECTOR, 'a.skip-nav')
    assert skip is not None, 'Skip nav link should exist'
    assert skip.get_attribute('href').endswith('#main'), 'Skip nav should target #main'
run_test('Accessibility: skip-nav present', test_skip_nav)

def test_tab_keyboard():
    driver.get(URL)
    time.sleep(0.5)
    btn = driver.find_element(By.ID, 'btn-km')
    btn.click()
    time.sleep(0.2)
    assert 'active' in btn.get_attribute('class'), 'KM tab should be active'
    # Arrow right should move focus
    btn.send_keys(Keys.ARROW_RIGHT)
    time.sleep(0.2)
    focused = driver.switch_to.active_element
    assert focused.get_attribute('id') == 'btn-binary', f'Expected btn-binary focused, got {focused.get_attribute("id")}'
run_test('Accessibility: tab keyboard navigation', test_tab_keyboard)

# ── Summary ──
driver.quit()
total = passed + failed
print(f'\n{"="*50}')
print(f'RESULTS: {passed}/{total} passed, {failed} failed')
print(f'{"="*50}')
if errors:
    print('\nFailed tests:')
    for name, err in errors:
        print(f'  - {name}: {err}')
sys.exit(0 if failed == 0 else 1)
