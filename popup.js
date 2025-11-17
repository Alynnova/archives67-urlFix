document.addEventListener("DOMContentLoaded", () => {

  const toggle = document.getElementById("enable-extension");
  const radios = document.querySelectorAll("input[name='mode']");
  const statusBox = document.getElementById("ext-status");

  // Charger l’état actuel
  chrome.storage.local.get(["enabled", "mode"], (cfg) => {
    toggle.checked = cfg.enabled;
    radios.forEach(r => r.checked = (r.value === cfg.mode));
  });

  // Changement ON/OFF
  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
    refreshStatus();
  });

  // Changement du mode
  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      chrome.storage.local.set({ mode: radio.value });
      refreshStatus();
    });
  });

  // Fonction pour mettre à jour l’état affiché
  function refreshStatus() {
    chrome.runtime.sendMessage({ type: "getStatus" });
  }

  // Réception de l’état depuis background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "statusResponse") {

      let txt = "";

      txt += msg.enabled
        ? "Extension : <span style='color:green'><b>Active</b></span><br>"
        : "Extension : <span style='color:red'><b>Désactivée</b></span><br>";

      txt += "Mode : <b>" + (msg.mode === "copy" ? "Copie" : "Téléchargement") + "</b><br>";

      txt += msg.detected
        ? "<span style='color:green'>Liens détectés sur la page ✔</span>"
        : "<span style='color:#999'>Aucun lien détecté</span>";

      statusBox.innerHTML = txt;
    }
  });

  // Initialisation
  refreshStatus();
});
