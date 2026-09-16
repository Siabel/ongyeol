"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed" };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const INSTALL_DISMISSED_KEY = "jakda:pwa-install-dismissed";
const INSTALL_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function installPromptSnoozed() {
  try {
    return (
      Date.now() - Number(localStorage.getItem(INSTALL_DISMISSED_KEY) ?? 0) <
      INSTALL_SNOOZE_MS
    );
  } catch {
    return false;
  }
}

function snoozeInstallPrompt() {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in private browsing; dismiss for this session only.
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function subscribeStandalone(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isAndroidChrome() {
  const ua = navigator.userAgent;
  const inAppBrowser =
    /; wv\)|Version\/4\.0|KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua);
  return isAndroid() && /Chrome\//i.test(ua) && !inAppBrowser;
}

function openInChrome() {
  const target = location.href.replace(/^https?:\/\//, "");
  const scheme = location.protocol === "http:" ? "http" : "https";
  location.href = `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

export function PwaManager() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const installed = useSyncExternalStore(
    subscribeStandalone,
    isStandalone,
    () => false,
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadForUpdate = useRef(false);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setShowAndroidGuide(false);
      if (!installPromptSnoozed()) {
        setInstallPrompt(event as InstallPromptEvent);
      }
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowIosGuide(false);
      setShowAndroidGuide(false);
      try {
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
      } catch {
        /* Ignore unavailable storage. */
      }
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    let iosGuideTimeout: ReturnType<typeof setTimeout> | undefined;
    let androidGuideTimeout: ReturnType<typeof setTimeout> | undefined;
    if (!installPromptSnoozed() && !isStandalone() && isIosSafari()) {
      iosGuideTimeout = setTimeout(() => setShowIosGuide(true), 0);
    }
    if (
      !installPromptSnoozed() &&
      !isStandalone() &&
      isAndroid() &&
      !isAndroidChrome()
    ) {
      androidGuideTimeout = setTimeout(() => setShowAndroidGuide(true), 1800);
    }

    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          registrationRef.current = registration;
          if (registration.waiting && navigator.serviceWorker.controller)
            setUpdateAvailable(true);

          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((error) =>
          console.warn("[pwa] 서비스 워커를 등록하지 못했어요.", error),
        );

      const handleControllerChange = () => {
        if (!reloadForUpdate.current) return;
        reloadForUpdate.current = false;
        location.reload();
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
      );
      return () => {
        if (iosGuideTimeout) clearTimeout(iosGuideTimeout);
        if (androidGuideTimeout) clearTimeout(androidGuideTimeout);
        window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
        window.removeEventListener("appinstalled", handleInstalled);
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      };
    }

    return () => {
      if (iosGuideTimeout) clearTimeout(iosGuideTimeout);
      if (androidGuideTimeout) clearTimeout(androidGuideTimeout);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const dismissInstall = () => {
    snoozeInstallPrompt();
    setInstallPrompt(null);
    setShowIosGuide(false);
    setShowAndroidGuide(false);
  };

  const applyUpdate = () => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) return location.reload();
    reloadForUpdate.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div className="pwa-layer" aria-live="polite">
      {!online && (
        <div className="network-banner" role="status">
          <span>오프라인</span>
          <p>
            현재 화면은 볼 수 있지만 기록 저장과 수정은 인터넷 연결 후 이용해
            주세요.
          </p>
        </div>
      )}
      {updateAvailable && (
        <aside className="pwa-notice update-notice" role="status">
          <div>
            <b>새로운 작은다음이 준비됐어요</b>
            <p>업데이트하면 최신 기능을 바로 사용할 수 있어요.</p>
          </div>
          <button className="primary" onClick={applyUpdate}>
            업데이트
          </button>
        </aside>
      )}
      {!installed && installPrompt && (
        <aside className="pwa-notice install-notice">
          <div>
            <b>작은다음을 홈 화면에 놓아보세요</b>
            <p>브라우저를 찾지 않고 앱처럼 바로 열 수 있어요.</p>
          </div>
          <div className="pwa-actions">
            <button className="text-button" onClick={dismissInstall}>
              7일 동안 보지 않기
            </button>
            <button className="primary" onClick={install}>
              앱 설치
            </button>
          </div>
        </aside>
      )}
      {!installed && showIosGuide && !installPrompt && (
        <aside className="pwa-notice install-notice ios-install">
          <div>
            <b>iPhone 홈 화면에 작은다음 추가</b>
            <p>
              Safari의 공유 버튼을 누른 뒤 <strong>홈 화면에 추가</strong>를
              선택해 주세요.
            </p>
          </div>
          <button
            className="text-button"
            onClick={dismissInstall}
            aria-label="설치 안내를 7일 동안 보지 않기"
          >
            7일 동안 보지 않기
          </button>
        </aside>
      )}
      {!installed && showAndroidGuide && !installPrompt && (
        <aside className="pwa-notice install-notice android-install">
          <div>
            <b>브라우저에서 작은다음을 설치해 보세요</b>
            <p>
              앱 안에서 열린 페이지는 설치를 지원하지 않을 수 있어요. Chrome으로
              연 뒤 메뉴의 <strong>앱 설치</strong>를 선택해 주세요.
            </p>
          </div>
          <div className="pwa-actions">
            <button className="text-button" onClick={dismissInstall}>
              7일 동안 보지 않기
            </button>
            <button className="primary" onClick={openInChrome}>
              Chrome에서 열기
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
