import Actions from "@/components/utilities/actions";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";
import { useRouter } from "next/router";

export default function Setup() {
  const router = useRouter();

  const handleClick = () => {
    window.ipc.invoke("set-music-folder", true).then((response) => {
      if (response) return;

      router.push("/home");
    });
  };

  return (
    <div className="wora-transition h-screen w-screen bg-black text-xs text-white antialiased">
      <Actions />
      <div className="flex h-full w-full select-none items-center p-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Image
              src="/assets/Full [Dark].png"
              width={124}
              height={0}
              alt="logo"
            />
            <div className="text-sm font-medium opacity-50">
              A beautiful player for audiophiles 🎧
            </div>
          </div>
          <Button
            className="absolute bottom-8 left-8 w-48 justify-between"
            onClick={handleClick}
          >
            Get Started
            <IconArrowRight stroke={2} className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
