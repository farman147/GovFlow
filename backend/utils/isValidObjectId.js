export const isValidObjectId = (value) => {
  if (value === null || value === undefined) return false;
  return /^[0-9a-fA-F]{24}$/.test(String(value).trim());
};
