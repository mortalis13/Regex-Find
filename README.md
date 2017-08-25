An alternative version of **RegexFind** addon based on overriding `nsIFind` XPCOM interface through Javascript.

The initial idea was taken from the old Firefox 3.5 addon **/Find Bar/** which previously existed on https://addons.mozilla.org/en-US/firefox/addon/find-bar/ with source code on http://hg.oxymoronical.com/extensions/FindBar/.

This implementation is only concentrates on finding and returning correct selection ranges of the found text, so the selection itself and focusing of editable elements (input, textarea) is processed by Firefox internal engine. No need to dig into setting correct selection, finding selection controllers for page or editable elements. But it seems it's slowlier in some cases compared to the **master** version, because the overridden `Find()` method is called by Firefox engine multiple times for the correct searching. So every time it processes the whole page. So the search speed depends on the page size.

The last release Firefox version which allows not-signed addons is 48. So this is the version in which this addon works.
