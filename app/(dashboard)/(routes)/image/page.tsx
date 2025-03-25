"use client";
import * as z from "zod";
import Heading from "@/components/heading";
import { Download, ImageIcon, Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { amountOptions, formSchema, resolutionOptions } from "./constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardFooter } from "@/components/ui/card";
import Image from "next/image";

function ImagePage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [storedImages, setStoredImages] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      amount: "1",
      resolution: "512x512",
    },
  });

  const isLoading = form.formState.isSubmitting;

  // Function to fetch previously stored images from your backend API
  const fetchStoredImages = async () => {
    try {
      const response1 = await axios.get("/api/image"); // Adjust API route as needed
      type ImageObject = { url: string; path: string };
      const response2: ImageObject[] = response1.data.reverse();
      const response: string[] = response2.map((img) => img.url);
      console.log("response: ", response);
      setStoredImages(response); // Assuming the backend returns an array of image URLs
    } catch (error) {
      console.error("Error fetching stored images:", error);
    }
  };

  useEffect(() => {
    fetchStoredImages();
    // Fetch images when the component mounts
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setImages([]);
      const response = await axios.post("/api/image", values);
      console.log("Generated Image URLs:", response.data); // Debugging
      setImages(response.data); // Store Firebase image URLs
      form.reset();
      fetchStoredImages(); // Refresh stored images after generating a new one
    } catch (error: any) {
      console.log(error);
    } finally {
      router.refresh();
    }
  };

  const handleDelete = async (imageUrl: string) => {
    try {
      // Extract the path from the full Firebase URL
      const imagePath = decodeURIComponent(
        imageUrl.split("/o/")[1].split("?")[0]
      );
      await axios.delete("/api/image", { data: { imagePath } });
      // Update UI after successful deletion
      setStoredImages((prev) => prev.filter((img) => img !== imageUrl));
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  return (
    <div className="text-xl font-bold">
      <Heading
        title="Image Generation"
        description="Turn your prompt into an image"
        icon={ImageIcon}
        iconColor="text-pink-700"
        bgColor="bg-pink-700/10"
      />
      <div className="px-4 lg:px-8">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="rounded-lg border w-full p-4 md:p-6 focus-within:shadow-sm grid grid-cols-12 gap-4"
            >
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-6">
                    <FormControl className="m-0 p-0">
                      <Input
                        className="border border-gray-300 p-2 rounded-md w-full"
                        disabled={isLoading}
                        placeholder="A picture of a horse in Swiss Alps"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 col-span-12 lg:col-span-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-12 lg:col-span-2">
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="">
                            <SelectValue defaultValue={field.value} />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="">
                          {amountOptions.map((option, index) => (
                            <SelectItem
                              className=""
                              key={index}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resolution"
                  render={({ field }) => (
                    <FormItem className="col-span-12 lg:col-span-2">
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="">
                            <SelectValue defaultValue={field.value} />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="">
                          {resolutionOptions.map((resolution, index) => (
                            <SelectItem
                              className=""
                              key={index}
                              value={resolution.value}
                            >
                              {resolution.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <Button
                  className="col-span-12 cursor-pointer lg:col-span-2 w-full"
                  disabled={isLoading}
                  variant="default"
                  size="default"
                >
                  Generate
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Displaying Freshly Generated Images */}
        <div className="space-y-4 mt-4">
          <hr></hr>
          <h2 className="text-xl border w-67 p-1 rounded bg-amber-100 font-semibold">
            Newly Generated Image(s):
          </h2>
          {isLoading && (
            <div className="p-20">
              <Loader />
            </div>
          )}
          {images.length === 0 && storedImages.length === 0 && !isLoading && (
            <div>
              <Empty label="No images generated yet." />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {images.map((img, index) => (
              <Card
                key={index}
                className="rounded-lg p-0 border-2 overflow-hidden"
              >
                <div className="relative aspect-square">
                  <Image
                    unoptimized
                    width={500}
                    height={500}
                    alt="Firebase Image"
                    src={img || null}
                  />
                </div>
                <CardFooter className="p-0">
                  <Button
                    onClick={() => window.open(img)}
                    variant="secondary"
                    className="w-[50] mx-auto border-2 bg-amber-300 cursor-pointer"
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Displaying Previously Stored Images */}
        {storedImages.length > 0 && (
          <div className="space-y-4 mt-6">
            <hr></hr>
            <h2 className="text-xl border w-77 p-1 rounded bg-amber-100 font-semibold">
              Previously Generated Image(s):
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              {storedImages.map((img, index) => (
                <Card
                  key={index}
                  className="rounded-lg p-0 overflow-hidden relative group"
                >
                  <div className="relative aspect-square">
                    <Image
                      unoptimized
                      width={500}
                      height={500}
                      alt="Previous Image"
                      src={img}
                    />
                    <Button
                      onClick={() => handleDelete(img)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      size="sm"
                      variant=""
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardFooter className="">
                    <Button
                      onClick={() => window.open(img)}
                      variant="secondary"
                      className="w-[50] mx-auto border-2 bg-amber-300 cursor-pointer"
                      size="lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImagePage;
