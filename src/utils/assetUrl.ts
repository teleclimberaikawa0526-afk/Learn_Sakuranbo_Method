export const withBase = (publicPath: string): string => {
  const clean = publicPath.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${clean}`;
};
