export const mediaTypes = {
 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif',
 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
} as const;
export function mediaMime(file: Pick<File,'type'|'name'>): string {
 if (file.type in mediaTypes) return file.type;
 if (!file.type) {
  const extension=file.name.split('.').at(-1)?.toLowerCase();
  const alias: Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',avif:'image/avif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
  return alias[extension??'']??'';
 }
 return '';
}
export function mediaError(files: Pick<File,'name'|'size'|'type'>[]): string | null {
 if(files.length>5) return 'Choose at most five files.';
 if(files.filter((file)=>mediaMime(file).startsWith('video/')).length>1) return 'Choose at most one video.';
 for(const file of files) {
  const mime=mediaMime(file);
  if(!mime) return 'Use JPEG, PNG, WebP, HEIC, AVIF, MP4, MOV or WebM files.';
  if(file.size<1 || file.size>(mime.startsWith('video/')?50:10)*1024*1024) return 'Photos must be at most 10 MB and videos at most 50 MB.';
 }
 return null;
}
