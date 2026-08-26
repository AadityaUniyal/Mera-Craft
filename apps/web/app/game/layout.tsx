export default function GameLayout({ children }: { children: React.ReactNode }) {
  // This layout returns just children — no Navbar or Footer wrapping.
  // The root layout handles <html> and <body>, and the Navbar/Footer
  // components self-hide when pathname starts with /game.
  return <>{children}</>;
}
