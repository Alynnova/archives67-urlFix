// Utilitaire log
function log(...msg) {
  console.log("[EXT Archives67]", ...msg);
}

// Icônes par état
const ICONS = {
  active: "icons/icon-active-48.png",
  inactive: "icons/icon-inactive-48.png",
  copy: "icons/icon-copy-48.png",
  download: "icons/icon-download-48.png"
};

// Mise à jour d’icône + état interne
function updateIcon(active, mode = "standard", tabId = null) {
  let path;

  if (!active) path = ICONS.inactive;
  else path = (mode === "copy" ? ICONS.copy : ICONS.download);

  const params = tabId ? { path, tabId } : { path };
  chrome.action.setIcon(params);
  log("Icon set:", path);
}

// Valeurs par défaut à l'installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true, mode: "standard" });
});

// Écoute des messages du content-script
chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message.type) {

    case "download":
      log("Téléchargement :", message.filename);
      chrome.downloads.download({
        url: message.url,
        filename: message.filename,
        saveAs: false
      }).catch(err => {
        log("Erreur téléchargement :", err.message);
        chrome.notifications.create({
          type: "basic",
          iconUrl: ICONS.inactive,
          title: "Erreur téléchargement",
          message: err.message
        });
      });
      break;

    case "notify":
      chrome.notifications.create({
        type: "basic",
        iconUrl: ICONS.active,
        title: message.title,
        message: message.message
      });
      break;

    case "setIcon":
      // Mise à jour dynamique selon l'état de l'extension et le mode
      chrome.storage.local.get(["enabled", "mode"], (cfg) => {
        updateIcon(message.active && cfg.enabled, cfg.mode, sender.tab?.id);
      });
      break;

    case "getStatus":  // Pour la popup
      chrome.storage.local.get(["enabled", "mode"], (cfg) => {
        chrome.tabs.sendMessage(sender.tab.id, { type: "checkLinks" }, (response) => {
          // Si liens détectés sur le site, icône active
          const detected = response?.found || false;
          updateIcon(detected && cfg.enabled, cfg.mode, sender.tab?.id);

          chrome.runtime.sendMessage({
            type: "statusResponse",
            enabled: cfg.enabled,
            mode: cfg.mode,
            detected
          });
        });
      });
      break;
  }
});
