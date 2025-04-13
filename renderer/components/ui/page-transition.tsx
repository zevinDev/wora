import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type PageTransitionProps = {
  children: React.ReactNode;
  isLoading?: boolean;
};

export const PageTransition = ({
  children,
  isLoading = false,
}: PageTransitionProps) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animate in on first mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 10); // Small delay to ensure CSS transitions work properly

    return () => clearTimeout(timer);
  }, []);

  // Handle child updates with animation
  useEffect(() => {
    // If loading, don't update the children yet to avoid interrupting the animation
    if (isLoading) {
      setIsTransitioning(true);
      return;
    }

    // When loading completes, update the children
    setDisplayChildren(children);
    setIsTransitioning(false);
  }, [children, isLoading]);

  return (
    <div
      className={`page-transition w-full transition-all duration-300 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${isLoading || isTransitioning ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}
      style={{ willChange: "transform, opacity" }}
    >
      {displayChildren}
    </div>
  );
};
