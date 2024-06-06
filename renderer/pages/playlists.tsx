import React from "react";
import Head from "next/head";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function Playlists() {
  const openDialog = () => {
    window.ipc.send("openDialog", 1);
  };

  return (
    <React.Fragment>
      <Head>
        <title>Playlists</title>
      </Head>
      <ScrollArea className="mt-2.5 h-full w-[88.15vw]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col">
              <div className="mt-2 text-base font-medium">Playlists</div>
              <div className="opacity-50">
                Hey Aaryan! Ready for a Jam Session?
              </div>
            </div>
            <div className="relative flex h-72 w-full gap-8">
              <div className="group/album wora-border w-52 cursor-pointer rounded-xl p-5 transition duration-300 hover:bg-black/5 dark:hover:bg-white/10">
                <div className="flex h-full flex-col justify-between">
                  <div className="relative h-2/3 w-full overflow-hidden rounded-xl shadow-xl duration-300">
                    <Image
                      alt="album"
                      src={"/images/bills.jpeg"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex w-full flex-col">
                    <p className="text-nowrap text-sm font-medium gradient-mask-r-70">
                      Never Say Die
                    </p>
                    <p className="opacity-50">CHVRCHES</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={openDialog}
                className="group/album wora-border w-52 cursor-pointer rounded-xl p-5 transition duration-300 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="relative flex h-2/3 w-full items-center justify-center overflow-hidden rounded-xl bg-white/20 shadow-xl transition duration-300">
                    <IconPlus className="h-5 w-5" />
                  </div>
                  <div className="flex w-full flex-col">
                    <p className="text-nowrap text-sm font-medium gradient-mask-r-70">
                      Select Music Folder
                    </p>
                    <p className="opacity-50">From Local Files</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </React.Fragment>
  );
}
