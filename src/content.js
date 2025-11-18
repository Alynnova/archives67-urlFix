//------------------------------------------------------------
// DÉTECTION FIABLE DES LIENS
//------------------------------------------------------------
function findDownloadLinks() {
    let links = document.querySelectorAll('a.monocle-Button[href*="iipsrv"][href*="CVT=JPG"]');
    if (links.length === 0) {
        links = document.querySelectorAll('a[href*="CVT=JPG"]');
    }
    return links;
}

//------------------------------------------------------------
// UTILITAIRES
//------------------------------------------------------------
function extractFileName(url) {
    const match = url.match(/%2F([^%]+)\.jpg/);
    return match ? match[1] : "document";
}

function copyImageToClipboard(url) {
    fetch(url)
        .then(res => res.blob())
        .then(blob => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    const item = new ClipboardItem({ "image/png": blob });
                    navigator.clipboard.write([item]).then(() => {
                        chrome.runtime.sendMessage({
                            type: "notify",
                            title: "Image copiée",
                            message: "L'image a été copiée dans le presse-papier."
                        });
                    });
                }, "image/png");
            };
            img.src = URL.createObjectURL(blob);
        });
}

//------------------------------------------------------------
// GESTION DU CLIC
//------------------------------------------------------------
const attachedLinks = new WeakMap(); // pour suivre le handler de chaque lien

function attachHandler(link) {
    if (attachedLinks.has(link)) return;

    const handler = (event) => {
        if (event.type !== "click") return;
		
		event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();

        chrome.storage.local.get({ mode: "standard", enabled: true }, (result) => {
            if (!result.enabled) return; // extension désactivée → ne rien faire

            const originalUrl = link.getAttribute("href");
            const newUrl = originalUrl.replace("&HEI=800", "");
            const fileName = extractFileName(newUrl);

            if (result.mode === "standard") {
                chrome.runtime.sendMessage({
                    type: "notify",
                    title: "Taille modifiée",
                    message: fileName + ".jpg"
                });
                chrome.runtime.sendMessage({
                    type: "download",
                    url: newUrl,
                    filename: fileName + ".jpg"
                });
            } else {
                const realHref = link.href;
                link.href = "javascript:void(0)";
                copyImageToClipboard(newUrl);

                setTimeout(() => {
                    link.href = realHref; // restauration
                }, 200);
            }
        });
    };

    link.addEventListener("click", handler, true); // capture phase
    attachedLinks.set(link, handler);
}

function detachHandler(link) {
    const handler = attachedLinks.get(link);
    if (!handler) return;
    link.removeEventListener("click", handler, true);
    attachedLinks.delete(link);
}

//------------------------------------------------------------
// OBSERVATION ET MISE À JOUR
//------------------------------------------------------------
function updateLinks(enabled) {
    const links = findDownloadLinks();
    links.forEach(link => {
        if (enabled) {
            attachHandler(link);
        } else {
            detachHandler(link); // enlève l'handler si extension désactivée
        }
    });
    chrome.runtime.sendMessage({ type: "setIcon", active: links.length > 0 });
}

function observeLinks() {
    chrome.storage.local.get({ enabled: true }, (cfg) => {
        updateLinks(cfg.enabled);
    });
}

//------------------------------------------------------------
// INITIALISATION
//------------------------------------------------------------
chrome.storage.local.get({ enabled: true }, (cfg) => {
    updateLinks(cfg.enabled);

    // MutationObserver pour nouveaux liens
    const observer = new MutationObserver(observeLinks);
    observer.observe(document.body, { childList: true, subtree: true });

    // Charger initialement
    window.addEventListener("load", observeLinks);
});

//------------------------------------------------------------
// ÉCOUTE DES CHANGEMENTS D'ÉTAT DANS LA POPUP
//------------------------------------------------------------
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) {
        const newValue = changes.enabled.newValue;
        console.log("[EXT] Extension activée :", newValue);
        updateLinks(newValue);
    }
});