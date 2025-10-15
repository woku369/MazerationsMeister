// Generate static params for the tank detail page
export async function generateStaticParams() {
  // Return empty array since we handle dynamic content on client side
  return [];
}

export default function TankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}