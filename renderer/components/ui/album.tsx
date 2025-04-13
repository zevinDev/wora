import Image from "next/image";
import Link from "next/link";
import React from "react";
import { convertTime } from "@/lib/helpers";

type Album = {
  id: string;
  name: string;
  artist: string;
  cover: string;
  duration?: number;
};

type AlbumCardProps = {
  album: Album;
};

const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
  return (
    <div className="group/album wora-border wora-transition rounded-2xl p-5 hover:bg-black/5 dark:hover:bg-white/10">
      <div className="relative flex flex-col justify-between">
        <Link href={`/albums/${album.id}`} passHref>
          <div className="relative w-full overflow-hidden rounded-xl pb-[100%] shadow-lg">
            <Image
              alt={album ? album.name : "Album Cover"}
              src={`wora://${album.cover}`}
              fill
              loading="lazy"
              className="z-10 cursor-pointer object-cover"
              quality={10}
            />
          </div>
        </Link>
        <div className="mt-8 flex w-full flex-col overflow-clip">
          <Link href={`/albums/${album.id}`} passHref>
            <p className="cursor-pointer truncate text-sm font-medium">
              {album.name}
            </p>
          </Link>
          <div className="flex items-center justify-between">
            <Link
              href={`/artists/${encodeURIComponent(album.artist)}`}
              passHref
            >
              <p className="text-primary mr-2 cursor-pointer truncate opacity-50 hover:underline">
                {album.artist}
              </p>
            </Link>
            <span className="shrink-0 text-xs opacity-50">
              {album.duration ? convertTime(album.duration) : "--:--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumCard;
