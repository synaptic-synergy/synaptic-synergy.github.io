// place files you want to import through the `$lib` alias in this folder.

export const buildURL = (base: string, obj: Record<string,string>) =>
    `${base}?${Object.entries(obj)
          .map(pair => pair.map(encodeURIComponent).join('='))
          .join('&')}`;