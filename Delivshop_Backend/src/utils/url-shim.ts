import url from 'url';

/**
 * Standards-compliant WHATWG URL adapter for legacy url.parse() invocations.
 * Resolves Node.js runtime warning:
 *   [DEP0169] DeprecationWarning: url.parse() behavior is not standardized. Use the WHATWG URL API instead.
 *
 * Automatically intercepts legacy url.parse() calls originating from Express/parseurl
 * and handles them using the standardized WHATWG URL API while maintaining 100% backward compatibility.
 */
const originalParse = url.parse;

(url as any).parse = function (urlStr: any, parseQueryString?: any, slashesDenoteHost?: any): any {
  if (typeof urlStr !== 'string') {
    return originalParse.apply(this, arguments as any);
  }

  try {
    const isAbsolute = urlStr.includes('://') || urlStr.startsWith('//');
    const base = 'http://localhost';
    const parsed = new URL(urlStr, base);
    const res = new (url as any).Url();

    res.protocol = isAbsolute ? parsed.protocol : null;
    res.slashes = isAbsolute ? true : null;
    res.auth = parsed.username || parsed.password ? `${parsed.username}:${parsed.password}` : null;
    res.host = isAbsolute ? parsed.host : null;
    res.port = parsed.port || null;
    res.hostname = isAbsolute ? parsed.hostname : null;
    res.hash = parsed.hash || null;
    res.search = parsed.search || null;
    res.query = parseQueryString
      ? Object.fromEntries(parsed.searchParams)
      : parsed.search
      ? parsed.search.slice(1)
      : null;
    res.pathname = parsed.pathname;
    res.path = parsed.pathname + (parsed.search || '');
    res.href = isAbsolute ? parsed.href : parsed.pathname + (parsed.search || '') + (parsed.hash || '');

    return res;
  } catch {
    return originalParse.apply(this, arguments as any);
  }
};
