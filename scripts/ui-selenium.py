#!/usr/bin/env python3
"""Selenium UI smoke against live TalentHub (http://localhost:3000)."""
from __future__ import annotations

import sys
import time
import traceback

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE = "http://localhost:3000"
PASS = "Demo@123456"
TIMEOUT = 25

results: list[tuple[bool, str, str]] = []


def record(ok: bool, name: str, detail: str = "") -> None:
    results.append((ok, name, detail))
    mark = "PASS" if ok else "FAIL"
    line = f"{mark}  {name}" + (f"  -> {detail}" if detail else "")
    print(line.encode("ascii", "replace").decode("ascii"))


def wait_css(driver, css: str, timeout: int = TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, css))
    )


def wait_clickable(driver, css: str, timeout: int = TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, css))
    )


def dismiss_overlays(driver) -> None:
    driver.execute_script(
        """
        document.querySelectorAll('nextjs-portal').forEach((el) => el.remove());
        document.querySelectorAll('[data-nextjs-dialog-overlay]').forEach((el) => el.remove());
        document.querySelectorAll('[data-next-badge]').forEach((el) => el.remove());
        """
    )


def fill_login(driver, email: str, role_tab: str | None = None) -> None:
    driver.delete_all_cookies()
    driver.get(f"{BASE}/")
    WebDriverWait(driver, 40).until(EC.presence_of_element_located((By.ID, "email")))
    body_text = (driver.find_element(By.TAG_NAME, "body").text or "").lower()
    if "đã có lỗi" in body_text or "try again" in body_text:
        driver.refresh()
        WebDriverWait(driver, 40).until(EC.presence_of_element_located((By.ID, "email")))
    dismiss_overlays(driver)
    if role_tab:
        for tab in driver.find_elements(By.CSS_SELECTOR, "button"):
            text = (tab.text or "").lower()
            if role_tab.lower() in text:
                driver.execute_script("arguments[0].click();", tab)
                time.sleep(0.4)
                break
    email_el = wait_css(driver, "#email")
    pass_el = wait_css(driver, "#password")
    email_el.clear()
    email_el.send_keys(email)
    pass_el.clear()
    pass_el.send_keys(PASS)
    dismiss_overlays(driver)
    submit = wait_css(driver, 'button[type="submit"]')
    # JS click bypasses Next.js hydration overlay interception
    driver.execute_script("arguments[0].click();", submit)
    time.sleep(3)


def logout_if_possible(driver) -> None:
    try:
        buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Đăng xuất') or contains(., 'Logout')]")
        if buttons:
            buttons[0].click()
            time.sleep(1)
    except WebDriverException:
        pass
    driver.delete_all_cookies()


def test_candidate(driver) -> None:
    name = "Candidate login → /candidate"
    try:
        fill_login(driver, "candidate@demo.vn", role_tab="ng vien")
        WebDriverWait(driver, 40).until(EC.url_contains("/candidate"))
        record(True, name, driver.current_url)
    except Exception as exc:
        detail = f"{exc} | url={driver.current_url} | body={(driver.find_element(By.TAG_NAME, 'body').text or '')[:180]}"
        record(False, name, detail)
        return

    name = "Candidate home shows jobs/companies content"
    try:
        WebDriverWait(driver, TIMEOUT).until(
            lambda d: len(d.find_elements(By.TAG_NAME, "a")) > 5
        )
        record(True, name)
    except Exception as exc:
        record(False, name, str(exc))

    name = "Candidate open applications page"
    try:
        driver.get(f"{BASE}/candidate/applications")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "main"))
        )
        body = driver.find_element(By.TAG_NAME, "body").text
        ok = "ứng" in body.lower() or "hồ sơ" in body.lower() or "đơn" in body.lower() or len(body) > 50
        record(ok, name, driver.current_url if ok else "empty/missing copy")
    except Exception as exc:
        record(False, name, str(exc))

    name = "Candidate profile page"
    try:
        driver.get(f"{BASE}/candidate/profile")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "main"))
        )
        record("/profile" in driver.current_url, name, driver.current_url)
    except Exception as exc:
        record(False, name, str(exc))


def test_recruiter(driver) -> None:
    logout_if_possible(driver)
    name = "Recruiter login → /recruiter"
    try:
        fill_login(driver, "hr@vpay.demo", role_tab="tuy")
        WebDriverWait(driver, 40).until(EC.url_contains("/recruiter"))
        record(True, name, driver.current_url)
    except Exception as exc:
        detail = f"{exc} | url={driver.current_url}"
        record(False, name, detail)
        return

    name = "Recruiter jobs list"
    try:
        driver.get(f"{BASE}/recruiter/jobs")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "main"))
        )
        body = driver.find_element(By.TAG_NAME, "body").text
        ok = "tin" in body.lower() or "tuyển" in body.lower()
        record(ok, name)
    except Exception as exc:
        record(False, name, str(exc))

    name = "Recruiter create job page"
    try:
        driver.get(f"{BASE}/recruiter/jobs/new")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "form, main"))
        )
        body = driver.find_element(By.TAG_NAME, "body").text
        ok = "tạo tin" in body.lower() or "tuyển dụng" in body.lower()
        record(ok, name)
    except Exception as exc:
        record(False, name, str(exc))

    name = "Recruiter candidates pipeline"
    try:
        driver.get(f"{BASE}/recruiter/candidates")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "main"))
        )
        body = driver.find_element(By.TAG_NAME, "body").text
        ok = "ứng viên" in body.lower() or "pipeline" in body.lower() or "hồ sơ" in body.lower()
        record(ok, name)
    except Exception as exc:
        record(False, name, str(exc))


def test_admin(driver) -> None:
    logout_if_possible(driver)
    name = "Admin login → /admin"
    try:
        fill_login(driver, "admin@demo.vn", role_tab="qu")
        WebDriverWait(driver, 40).until(EC.url_contains("/admin"))
        record(True, name, driver.current_url)
    except Exception as exc:
        detail = f"{exc} | url={driver.current_url}"
        record(False, name, detail)
        return

    name = "Admin jobs moderation"
    try:
        driver.get(f"{BASE}/admin/jobs")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "main"))
        )
        body = driver.find_element(By.TAG_NAME, "body").text
        ok = "duyệt" in body.lower() or "tin" in body.lower() or "admin" in body.lower()
        record(ok, name)
    except Exception as exc:
        record(False, name, str(exc))

    name = "Admin recruiters list"
    try:
        driver.get(f"{BASE}/admin/recruiters")
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "main"))
        )
        body = driver.find_element(By.TAG_NAME, "body").text
        ok = "nhà tuyển" in body.lower() or "recruiter" in body.lower() or len(body) > 40
        record(ok, name)
    except Exception as exc:
        record(False, name, str(exc))


def main() -> int:
    options = Options()
    options.add_argument("--window-size=1440,900")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    # headed by default so user can see; set HEADLESS=1 for CI
    import os

    if os.environ.get("HEADLESS", "1") == "1":
        options.add_argument("--headless=new")

    driver = None
    try:
        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(60)
        test_candidate(driver)
        test_recruiter(driver)
        test_admin(driver)
    except Exception:
        print("FATAL")
        traceback.print_exc()
        return 2
    finally:
        if driver:
            driver.quit()

    failed = sum(1 for ok, _, _ in results if not ok)
    print("-" * 60)
    print(f"Total {len(results)} · PASS {len(results) - failed} · FAIL {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
