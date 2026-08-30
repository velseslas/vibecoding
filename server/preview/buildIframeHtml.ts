import { logger } from '../logger';

export interface VirtualFile {
  name: string;
  type?: 'html' | 'javascript' | 'css' | 'json' | string;
  content: string;
}

/**
 * Assembles a collection of modular files (HTML, CSS, JS components)
 * into a single executable document for iframe preview execution,
 * while preserving multi-file structure for editing and iteration.
 */
export function buildIframeHtml(
  files: VirtualFile[] | undefined | null,
  entryPoint = 'index.html'
): string {
  if (!files || files.length === 0) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Application VibeCode</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-6">
  <p class="text-slate-400 text-sm">Aucun fichier à afficher</p>
</body>
</html>`;
  }

  // 1. Locate entry point HTML file
  let mainHtmlFile = files.find(
    (f) => f.name === entryPoint || f.name.toLowerCase() === 'index.html'
  );
  if (!mainHtmlFile) {
    mainHtmlFile = files.find((f) => f.name.toLowerCase().endsWith('.html'));
  }

  if (!mainHtmlFile) {
    // Generate standard HTML template container if only JS/CSS files exist
    mainHtmlFile = {
      name: 'index.html',
      type: 'html',
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application VibeCode</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div id="app"></div>
  <div id="root"></div>
</body>
</html>`,
    };
  }

  let html = mainHtmlFile.content || '';
  const inlinedFiles = new Set<string>([mainHtmlFile.name]);

  // 2. Process and inline CSS files
  const cssFiles = files.filter(
    (f) =>
      (f.type === 'css' || f.name.toLowerCase().endsWith('.css')) &&
      f.name !== mainHtmlFile!.name
  );

  // Replace <link rel="stylesheet" href="..."> tags with inline <style>
  html = html.replace(
    /<link\s+[^>]*rel=["'](?:stylesheet|preload)["'][^>]*href=["']([^"']+)["'][^>]*>|<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:stylesheet|preload)["'][^>]*>/gi,
    (match, href1, href2) => {
      const href = (href1 || href2 || '').trim();
      if (!href) return match;
      const cleanHref = href.replace(/^\.\//, '');
      const matchedCss = cssFiles.find(
        (f) =>
          f.name === cleanHref ||
          f.name.endsWith('/' + cleanHref) ||
          cleanHref.endsWith(f.name) ||
          f.name.split('/').pop() === cleanHref.split('/').pop()
      );
      if (matchedCss) {
        inlinedFiles.add(matchedCss.name);
        return `<style data-file="${matchedCss.name}">\n${matchedCss.content}\n</style>`;
      }
      return match;
    }
  );

  // 3. Process and inline JS files
  const jsFiles = files.filter(
    (f) =>
      (f.type === 'javascript' ||
        f.type === 'js' ||
        f.name.toLowerCase().endsWith('.js')) &&
      f.name !== mainHtmlFile!.name
  );

  // Replace <script src="..."></script> tags with inline script type="module" content
  html = html.replace(
    /<script(?:\s+[^>]*)?\s+src=["']([^"']+)["'](?:\s+[^>]*)?>\s*<\/script>/gi,
    (match, src) => {
      if (!src) return match;
      const trimmedSrc = src.trim();
      if (
        trimmedSrc.startsWith('http://') ||
        trimmedSrc.startsWith('https://') ||
        trimmedSrc.startsWith('//')
      ) {
        return match; // Keep external CDN scripts (Tailwind, Lucide, fonts, etc.)
      }
      const cleanSrc = trimmedSrc.replace(/^\.\//, '');
      const matchedJs = jsFiles.find(
        (f) =>
          f.name === cleanSrc ||
          f.name.endsWith('/' + cleanSrc) ||
          cleanSrc.endsWith(f.name) ||
          f.name.split('/').pop() === cleanSrc.split('/').pop()
      );
      if (matchedJs) {
        inlinedFiles.add(matchedJs.name);
        return `<script type="module" data-file="${matchedJs.name}">\n${matchedJs.content}\n</script>`;
      }
      return match;
    }
  );

  // 4. Inject remaining CSS files in <head>
  const remainingCss = cssFiles.filter((f) => !inlinedFiles.has(f.name));
  if (remainingCss.length > 0) {
    const extraCss = remainingCss
      .map((f) => `  <style data-file="${f.name}">\n${f.content}\n  </style>`)
      .join('\n');
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${extraCss}\n</head>`);
    } else {
      html = `<head>\n${extraCss}\n</head>\n${html}`;
    }
  }

  // 5. Inject remaining JS files in dependency order (components/modules first, app.js last) as ES6 modules
  const remainingJs = jsFiles.filter((f) => !inlinedFiles.has(f.name));
  if (remainingJs.length > 0) {
    const sortedJs = [...remainingJs].sort((a, b) => {
      const aIsMain =
        a.name.toLowerCase().includes('app.js') ||
        a.name.toLowerCase().includes('main.js') ||
        a.name.toLowerCase().includes('index.js');
      const bIsMain =
        b.name.toLowerCase().includes('app.js') ||
        b.name.toLowerCase().includes('main.js') ||
        b.name.toLowerCase().includes('index.js');
      if (aIsMain && !bIsMain) return 1;
      if (!aIsMain && bIsMain) return -1;
      return a.name.localeCompare(b.name);
    });

    const extraJs = sortedJs
      .map((f) => `<script type="module" data-file="${f.name}">\n${f.content}\n</script>`)
      .join('\n');

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${extraJs}\n</body>`);
    } else {
      html = `${html}\n${extraJs}`;
    }
  }

  // 6. Ensure Tailwind CSS CDN is present
  if (!html.includes('cdn.tailwindcss.com')) {
    const tailwindTag = '  <script src="https://cdn.tailwindcss.com"></script>';
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${tailwindTag}`);
    } else {
      html = `${tailwindTag}\n${html}`;
    }
  }

  // 7. Ensure Lucide CDN is present
  if (!html.includes('unpkg.com/lucide')) {
    const lucideTag = '  <script src="https://unpkg.com/lucide@latest"></script>';
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${lucideTag}`);
    } else {
      html = `${lucideTag}\n${html}`;
    }
  }

  // 8. Auto-trigger lucide icons creation if referenced
  if (
    html.includes('lucide') &&
    !html.includes('lucide.createIcons()') &&
    !html.includes('lucide.createIcons')
  ) {
    const lucideInit = `\n<script type="module">\n  const initLucide = () => {\n    if (window.lucide && typeof window.lucide.createIcons === 'function') {\n      window.lucide.createIcons();\n    }\n  };\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', initLucide);\n  } else {\n    initLucide();\n  }\n  window.addEventListener('load', initLucide);\n</script>`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${lucideInit}\n</body>`);
    } else {
      html = `${html}\n${lucideInit}`;
    }
  }

  return html;
}

/**
 * Splits a single HTML string into modular files (index.html, style.css, app.js)
 * for backward compatibility when a legacy single-file HTML is supplied.
 */
export function extractFilesFromHtml(html: string): VirtualFile[] {
  if (!html) {
    return [{ name: 'index.html', type: 'html', content: '' }];
  }

  let workingHtml = html;
  let customCss = '';
  let customJs = '';

  // Extract inline <style>...</style>
  const styleRegex = /<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    customCss += styleMatch[1].trim() + '\n\n';
  }

  // Extract inline <script>...</script> (excluding external CDNs)
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const fullTag = scriptMatch[0];
    if (!fullTag.includes('src=')) {
      const scriptBody = scriptMatch[1].trim();
      if (scriptBody.length > 0) {
        customJs += scriptBody + '\n\n';
      }
    }
  }

  const files: VirtualFile[] = [
    {
      name: 'index.html',
      type: 'html',
      content: workingHtml,
    },
  ];

  if (customCss.trim()) {
    files.push({
      name: 'style.css',
      type: 'css',
      content: customCss.trim(),
    });
  }

  if (customJs.trim()) {
    files.push({
      name: 'app.js',
      type: 'javascript',
      content: customJs.trim(),
    });
  }

  return files;
}

