import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="site-main">{children}</div>
      <footer className="site-foot">
        <div className="inner"><span>Newton</span><span>Same design as the admin area</span></div>
      </footer>
    </>
  );
}
