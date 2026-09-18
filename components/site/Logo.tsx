/** 品牌標誌：朱紅印章方塊＋襯線字標。純裝飾的印章對輔助科技隱藏，字標才是可讀名稱。 */
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid shrink-0 -rotate-3 place-items-center rounded-[5px] bg-accent font-serif font-black text-white dark:text-black"
        style={{ width: size, height: size, fontSize: size * 0.62 }}
      >
        審
      </span>
      <span className="font-serif text-[17px] font-bold tracking-wide">推甄審查模擬器</span>
    </span>
  );
}
