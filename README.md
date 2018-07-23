## Regex Find [Firefox Addon]

The addon offers basic regex search functionality with these limitations:

- some Regex control symbols - \f, \r, \n, \v
- by default doesn't search in dynamically loaded content
- doesn't support lookbehind search because it's not implemented in Javascript

**From v1.2.0 there is a new addon-browser versioning:**

- **1.2.0-45** - corresponds to Firefox versions 45-49
- **1.2.0-50** - Firefox 50-54
- **1.2.0-55** - Firefox 55-56
- **1.2.0-57** - Firefox Nighlty 57+

Tips:

1. To search dynamic content (AJAX added text, when hidden elements become visible) it's necessary to reload the regex search (uncheck/check) the Regex button, so the addon will rescan the page text with all its current content.
2. In Firefox Nightly 57+ the search should be used in a non-multiprocess window in which the addon will have access to browser internal objects needed to perform the page text scanning and search. To open this type of window go to File - New Non-e10s Window. It's also possible to disable multiprocess behavior for the whole browser in the Options - Enable multi-process Nightly, the any pages will support the Regex search.
3. F2 shortcut can be used for backward search.

---

### Version 1.2.0

- prevent force search field focus on findAgain
- focus inputs when selecting found text
- support for searching in dynamically changed inputs
- single version for 4 browser version ranges: Firefox 45-49, 50-54, 55-56, Nightly 57+

### Version 1.1.8:

- support for versions 55-56

### Version 1.1.7:

- support for versions 45-49

### Version 1.1.6:

- search in input elements (input, textarea)
- search in iframe elements
- search in button elements
- search after page reload

---

To **install** the addon go to [releases](https://github.com/mortalis13/Regex-Find/releases) and click on the **.xpi** file or download and drag it to the browser window.

---

For **Firefox 57+** you should install the addon in the **Nightly** version of the browser. Before installation the browser needs to be configured to allow unsigned legacy addons. 

See this **tutorial** for details on how to use legacy addons in Firefox Nightly edition: [Install Legacy Addons in Firefox Nightly 57+](http://pcadvice.co.nf/blog/install-legacy-addons-in-firefox-57).

In short the steps are the following:

- install Nightly edition and create a new Firefox profile for it if you want
- enable legacy addons setting `about:config?filter=extensions.legacy.enabled` preference to `true`
- enable unsigned addons setting `about:config?filter=xpinstall.signatures.required` preference to `false`
- disable multiprocess mode if the addon gives errors setting `about:config?filter=browser.tabs.remote.autostart` to `false`
