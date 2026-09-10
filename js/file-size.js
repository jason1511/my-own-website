window.formatFileSize = function (value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size unknown";
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024, index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
  if (size < 0.1) return "< 0.1 KB";
  return `${Number(size.toFixed(1))} ${units[index]}`;
};
