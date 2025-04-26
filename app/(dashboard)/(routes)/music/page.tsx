"use client";
import * as z from "zod";
import Heading from "@/components/heading";
import { Music, Trash } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { formSchema } from "./constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { db, storage } from "@/configs/FirebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

function MusicPage() {
  const router = useRouter();
  const [musicList, setMusicList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" },
  });

  useEffect(() => {
    fetchMusic();
  }, []);

  const fetchMusic = async () => {
    const querySnapshot = await getDocs(collection(db, "music"));
    const musicData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setMusicList(musicData);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/music", values);
      if (response.data && response.data.audio) {
        await addDoc(collection(db, "music"), { url: response.data.audio });
        fetchMusic();
      }
      form.reset();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMusic = async (id: string, url: string) => {
    try {
      await deleteDoc(doc(db, "music", id));
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
      setMusicList((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting music:", error);
    }
  };

  return (
    <div className="text-2xl font-bold">
      <Heading
        title="Music Generation"
        description="Turn your prompt into music."
        icon={Music}
        iconColor="text-emerald-500"
        bgColor="bg-emerald-500/10"
      />
      <div className="px-4 lg:px-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
          >
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="col-span-12 lg:col-span-10">
                  <FormControl>
                    <Input
                      className="border-0 outline-none focus-visible:ring-0"
                      disabled={isLoading}
                      placeholder="Piano solo"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              className="col-span-12 lg:col-span-2 w-full"
              disabled={isLoading}
              variant="default"
              size="lg"
            >
              Generate
            </Button>
          </form>
        </Form>

        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
              <Loader />
            </div>
          )}
          {!isLoading && musicList.length === 0 && (
            <Empty label="No music generated yet." />
          )}
          {musicList.map((music) => (
            <div
              key={music.id}
              className="flex justify-between items-center bg-muted p-4 rounded-lg"
            >
              <audio controls className="w-full">
                <source src={music.url} type="audio/mp3" />
              </audio>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMusic(music.id, music.url)}
                className="cursor-pointer hover:bg-black"
              >
                <Trash className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MusicPage;
