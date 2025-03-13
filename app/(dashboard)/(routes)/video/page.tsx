"use client";
import * as z from "zod";
import Heading from "@/components/heading";
import { VideoIcon } from "lucide-react";
import React, { useState } from "react";
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

function VideoPage() {
  const router = useRouter();
  const [video, setVideo] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setVideo(undefined);

      const response = await axios.post("/api/video", values);
      console.log("[F: API RESPONSE]", response.data);

      // [F: API RESPONSE] {videoUrl: 'https://replicate.delivery/yhqm/AV6Mp9AmHeXyNyIMYA8d2R6LNQvKaK04UWphzjlsgpGW7kLKA/output-0.mp4'}

      // Ensure videoUrl is a valid string before setting it
      if (response.data && typeof response.data.videoUrl === "string") {
        setVideo(response.data.videoUrl);
      } else {
        console.error("Invalid video URL received:", response.data);
      }
      form.reset();
    } catch (error: any) {
      // TODO: Open Pro Model
      console.error("[ERROR]", error);
    } finally {
      router.refresh();
    }
  };

  return (
    <div className="text-2xl font-bold">
      <Heading
        title="Video Generation"
        description="Turn your prompt into video."
        icon={VideoIcon}
        iconColor="text-orange-700"
        bgColor="bg-orange-700/10"
      />
      <div className="px-4 lg:px-8">
        <div>
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
                    <FormControl className="m-0 p-0">
                      <Input
                        className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                        disabled={isLoading}
                        placeholder="Clown fish swimming around a coral reef."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                className="col-span-12 cursor-pointer lg:col-span-2 w-full"
                disabled={isLoading}
                variant="default"
                size="lg"
              >
                Generate
              </Button>
            </form>
          </Form>
        </div>
        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
              <Loader />
            </div>
          )}
          {!video && !isLoading && (
            <div>
              <Empty label="No video generated yet." />
            </div>
          )}
          {video && (
            <video controls className="w-full mt-8 rounded-lg border bg-black">
              <source src={video} type="video/mp4" />
            </video>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPage;
