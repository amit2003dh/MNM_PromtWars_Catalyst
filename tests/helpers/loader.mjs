import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const SRC_DIR = path.resolve(process.cwd(), 'src');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: pathToFileURL(require.resolve('next/server')).href,
      shortCircuit: true,
    };
  }
  if (specifier === 'next/headers') {
    return {
      url: pathToFileURL(require.resolve('next/headers')).href,
      shortCircuit: true,
    };
  }

  let targetPath = null;

  if (specifier.startsWith('@/')) {
    const relativePath = specifier.slice(2);
    targetPath = path.resolve(SRC_DIR, relativePath);
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const parentPath = fileURLToPath(context.parentURL);
    targetPath = path.resolve(path.dirname(parentPath), specifier);
  }

  if (targetPath) {
    const basePath = targetPath.endsWith('.js') ? targetPath.slice(0, -3) : targetPath;
    const candidates = [
      targetPath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${targetPath}.ts`,
      `${targetPath}.tsx`,
      `${targetPath}.js`,
      `${targetPath}.mjs`,
      path.join(targetPath, 'index.ts'),
      path.join(targetPath, 'index.tsx'),
      path.join(targetPath, 'index.js'),
      path.join(basePath, 'index.ts'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          url: pathToFileURL(candidate).href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');

    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      },
      fileName: filePath,
    });

    return {
      format: 'module',
      source: result.outputText,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
