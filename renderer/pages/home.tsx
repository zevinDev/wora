import React, { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AlbumCard } from "@/components/ui/album";
import Songs from "@/components/ui/songs";

export default function Home() {
  const [library, setLibrary] = useState<any | null>([]);

  useEffect(() => {
    window.ipc.invoke("getRandomLibraryItems").then((response) => {
      setLibrary(response);
    });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col">
          <div className="mt-4 text-lg font-medium leading-6">Home</div>
          <div className="opacity-50">
            The coolest music library in the world.
          </div>
        </div>
        {library?.albums && library.albums.length > 5 && (
          <Carousel
            className="relative w-[88vw]"
            opts={{
              loop: true,
            }}
          >
            <CarouselPrevious className="absolute left-0 z-50 my-0" />
            <div className="w-full gradient-mask-r-80-d">
              <CarouselContent className="-ml-8">
                {library.albums.map((album: any, index: number) => (
                  <CarouselItem key={index} className="basis-1/5 pl-8">
                    <AlbumCard album={album} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </div>
            <CarouselNext className="absolute right-0 z-50 my-0" />
          </Carousel>
        )}
        <div>
          <Songs library={library?.songs} />
        </div>
      </div>
    </div>
  );
}
