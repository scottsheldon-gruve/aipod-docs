const TWO_DAYS = 172_800_000;
const ONE_MINUTE = 60_000;
const ANNOUNCEMENT_CACHE_KEY = "igx-announcement";

document.addEventListener("DOMContentLoaded", () => {
    accordionsInit();
    announcementsInit();
    docInit();
    userDropdownInit();
    userLoginButtonInit();
});

//Initializers
//Accordion
function accordionsInit() {
    const accordions = document.querySelectorAll("[data-type='accordion']");

    accordions.forEach(function (elem) {
        const icon = elem.querySelector("[data-type='rotate-icon']");
        const expanded = elem.getAttribute("aria-expanded");

        elem.addEventListener("click", function () {
            icon?.classList.toggle("rotate-180");
        });
        if (icon != null && expanded == "false") {
            icon.classList.add("rotate-180");
        }
    });
}

//Announcements
function announcementsInit() {
    const announcements = document.querySelectorAll(
        "[data-type='announcement']"
    );
    const closeButtons = document.querySelectorAll(
        "[data-close='announcement-close']",
    );
    const expandButtons = document.querySelectorAll(
        "[data-expand='announcement-expand']",
    );

    announcements.forEach(function (elem) {
        const uId = elem.getAttribute("data-uid");
        const isCachable = elem.getAttribute("data-cachable");
        if (!isCachable || showAnnouncement(ANNOUNCEMENT_CACHE_KEY + "-" + uId)) {
            elem.classList.toggle("hidden");
        }
    });

    closeButtons.forEach(function (elem) {
        elem.addEventListener("click", function () {
            const announcement = elem.closest("[data-type='announcement']");
            const uId = announcement.getAttribute("data-uid");
            announcement?.classList.toggle("hidden");
            storeExpirationData(ANNOUNCEMENT_CACHE_KEY + "-" + uId, TWO_DAYS)
        });
    });

    expandButtons.forEach(function (elem) {
        elem.addEventListener("click", function (e) {
            e.preventDefault();
            const content = elem
                .closest("[data-type='announcement']")
                ?.querySelector("[data-content='announcement-content']");
            elem
                .closest("[data-type='announcement']")
                ?.querySelector(".items-center")
                ?.classList.remove("items-center");
            content?.classList.toggle("hidden");
            elem.classList.toggle("hidden");
        });
    });
}

//Article documentation side navigation
function docInit() {
    const collapseButton = document.querySelector("[data-collapse='doc-side']");
    const menu = document.querySelector("[data-type='doc-side']");

    collapseButton?.addEventListener("click", function (e) {
        menu?.classList.toggle("hidden");
    });
}

//Login/Account user dropdown
function userDropdownInit() {
    const collapseButton = document.querySelector(
        "[data-collapse='user-dropdown']",
    );
    const arrow = document.querySelector("[data-type='user-dropdown-arrow']");
    const cancel = document.querySelector("[data-cancel='user-dropdown-cancel']");
    const parent = document.querySelector("[data-parent='user-dropdown']");

    const showUserDropdownAnimation = anime.timeline({
        easing: "linear",
        autoplay: false,
        begin: function (anim) {
            displayElement(true, parent, arrow);
        },
        complete: function (anim) {
            if (anim.reversed) {
                displayElement(false, parent, arrow);
            }
        },
    });

    showUserDropdownAnimation.add({
        targets: parent,
        opacity: [0, 1],
        duration: 250,
    });

    setIconRotation(parent, arrow);
    collapseButton?.addEventListener("click", function (e) {
        handleToggleAnimation(showUserDropdownAnimation);
    });
    cancel?.addEventListener("click", function (e) {
        showUserDropdownAnimation.reverse();
        if (showUserDropdownAnimation.paused) {
            showUserDropdownAnimation.play();
        }
    });
}

//Helpers
function setIconRotation(hiddenSelector, iconSelector) {
    if (!hiddenSelector?.classList.contains("hidden")) {
        iconSelector?.classList.add("rotate-180");
    } else {
        iconSelector?.classList.remove("rotate-180");
    }
}

function handleToggleAnimation(anim) {
    if (anim.began) {
        anim.reverse();
        if (anim.progress === 100 && anim.direction === "reverse") {
            anim.completed = false;
        }
    }

    if (anim.paused) {
        anim.play();
    }
}

function displayElement(display, element, icon) {
    if (display) {
        element?.classList.remove("hidden");
    } else {
        element?.classList.add("hidden");
    }
    icon?.classList.toggle("rotate-180");
}

//Caching
function storeExpirationData(cacheName, hideTime) {
    const json = {
        expiration: Date.now() + hideTime
    }
    cacheItem(cacheName, json);
}

function cacheItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function isValidCookieConsent(expirationTime, currentTime) {
    return expirationTime > currentTime;
}

function showAnnouncement(cacheName) {
    const storedString = localStorage.getItem(cacheName);

    if (storedString) {
        const {expiration} = JSON.parse(storedString);

        if (isValidCookieConsent(expiration, Date.now()))
            return false;
    }

    localStorage.removeItem(cacheName);
    return true;
}

function userLoginButtonInit() {
    const form = document.getElementById("login-form");

    document.getElementById("login-form-submit").addEventListener("click", function () {
        form.submit();
    });
}


function clearFilters() {
    const filters = document.getElementById("search-filters");
    const checked = filters.querySelectorAll("input:checked");

    checked.forEach(t => t.checked = false);
}

function clearInputAndAbortSuggestions() {
    const searchInput = document.getElementById("search-input");
    const searchInputCancelIcon = document.getElementById("search-input-clear");
    const searchSuggestions = document.getElementById("search-suggestions");

    htmx.trigger("#search-input", "htmx:abort");
    searchInputCancelIcon?.classList.add("invisible");
    searchSuggestions?.classList.add("hidden");

    searchInput ? searchInput.value = "" : void (0);
}

function configureSearchRequest(event, term) {
    const isLoadMore = event.detail.target.id.startsWith("search-load-more");
    const isBoost = event.detail.headers["HX-Boosted"] === "true";

    if (isBoost || isLoadMore) {
        return;
    }

    const categoryIds = [];

    const filters = document.getElementById("search-filters");
    const activeFilters = filters.querySelectorAll("input:checked");
    const tags = document.getElementById("search-tags");
    const sort = tags.querySelector("select");

    for (let i = 0; i < activeFilters.length; i++) {
        categoryIds.push(activeFilters[i].value);
    }

    event.detail.parameters.sort = sort.value;
    event.detail.parameters.cat = categoryIds;
    event.detail.parameters.term = term;
}

function configureSearchSuggestRequest(event, bookMapPath) {
    event.detail.parameters.bookMapPath = bookMapPath;
}

function searchSuggest() {
    const searchInput = document.getElementById("search-input");
    const searchInputCancelIcon = document.getElementById("search-input-clear");

    if (searchInput?.value.trim().length === 0) {
        htmx.trigger("#search-input", "htmx:abort");
        const searchSuggestions = document.getElementById("search-suggestions");

        searchSuggestions?.classList.add("hidden");
        searchInputCancelIcon?.classList.add("invisible");

        return;
    }

    searchInputCancelIcon?.classList.remove("invisible");
}

function syncFilters() {
    const filters = document.getElementById("search-filters");
    const tags = document.getElementById("search-tags");

    const activeFilters = [...filters.querySelectorAll("input:checked")];
    const activeTagCategoryIds = [...tags.querySelectorAll("input:checked")].map(t => t.value);

    for (let i = 0; i < activeFilters.length; i++) {
        const filter = activeFilters[i];
        if (activeTagCategoryIds.includes(filter.value)) {
            continue;
        }

        filter.checked = false;
    }
}

function toggleChildCategoryList(htmlButtonElement) {
    const list = htmlButtonElement?.nextElementSibling;
    htmlButtonElement?.classList.toggle("rotate-90");
    list?.classList.toggle("hidden");

    const descendantLists = list?.querySelectorAll("ul");
    const descendantButtons = list?.querySelectorAll("button");

    const isClosed = list?.classList.contains("hidden");

    if (!isClosed) {
        for (let i = 0; i < descendantLists.length; i++) {
            const ul = descendantLists[i];
            const checkedBoxes = ul.querySelectorAll("label > input:checked");
            const hasSelectionWithin = checkedBoxes.length > 0;

            if (!hasSelectionWithin) {
                continue;
            }

            ul.classList.remove("hidden");
            ul.previousElementSibling.classList.add("rotate-90");
        }

        return;
    }

    descendantLists.forEach(l => l.classList.add("hidden"));
    descendantButtons.forEach(b => b.classList.remove("rotate-90"));
}

function toggleList(htmlButtonElement) {
    if (!htmlButtonElement) return;

    htmlButtonElement.dataset.open = htmlButtonElement.dataset.open === "false";
    const closestLi = htmlButtonElement.closest("li");

    const directChildLists = closestLi
        ? [...closestLi.children].filter(c => c.nodeName === "UL")
        : [];

    htmlButtonElement.classList.toggle("rotate-90");
    directChildLists.forEach(l => l.classList.toggle("hidden"));
}

function tabs() {
    const tabSets = document.querySelectorAll("[data-tab-set]");

    tabSets.forEach((tabSet) => {
        const tabButtons = tabSet.querySelectorAll("[data-tab-button]");
        const tabContents = tabSet.querySelectorAll("[data-tab-content]");

        tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                tabButtons.forEach((btn) => {
                    btn.classList.remove("border-apple", "opacity-60");
                    btn.classList.add("border-transparent");
                    btn.setAttribute("aria-selected", "false");
                });

                tabContents.forEach((content) => {
                    content.classList.add("hidden");
                });

                button.classList.add("border-apple");
                button.classList.remove("border-transparent");
                button.classList.remove("opacity-60");
                button.setAttribute("aria-selected", "true");

                const activeContentId = button.getAttribute("data-tab-button");
                const activeContent = tabSet.querySelector(`[data-tab-content="${activeContentId}"]`);
                if (activeContent) {
                    activeContent.classList.remove("hidden");
                }

                tabButtons.forEach((btn) => {
                    if (btn !== button) {
                        btn.classList.add("opacity-60");
                    }
                });
            });
        });
    });
}

function eventDispatch(element, eventName, delay = 0) {
    if (!element) return;
    if (typeof element.dispatchEvent !== "function")
        return console.error("element must implement EventTarget");

    if (delay === 0) {
        element.dispatchEvent(new CustomEvent(eventName, {bubbles: true}));
        return;
    }

    if (element.igxtimeoutid) clearTimeout(element.igxtimeoutid);
    element.igxtimeoutid = setTimeout(() => element.dispatchEvent(new CustomEvent(eventName, {bubbles: true})), delay);
}
