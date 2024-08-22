import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Lilita_One } from "next/font/google";
import logo from "/public/assets/logo.svg";
import Telegram from "../../public/assets/socials/Telegram";
import X from "../../public/assets/socials/X";
import TikTok from "../../public/assets/socials/Tiktok";
import DexScreener from "../../public/assets/socials/Dexscreener";
import DexTools from "../../public/assets/socials/Dextools";
import { assets, mobileAssets } from "@/utils/Assets";
import { toast, ToastContainer } from "react-toastify";
import { fabric } from "fabric";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });
const lilita = Lilita_One({ weight: ["400"], subsets: ["latin"] });

const elements = [
  "/assets/elements/topBigCat.png",
  "/assets/elements/fireRainbow.png",
  "/assets/elements/ghost.png",
  "/assets/elements/leftcat.png",
  "/assets/elements/rightcat.png",
  "/assets/elements/side.png",
  "/assets/elements/sidecat.png",
  "/assets/elements/topcat.png",
];

export default function Home() {
  const [copying, setCopying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<fabric.Image | null>(null);
  const [overlay, setOverlay] = useState<fabric.Image | null>(null);
  const [stickers, setStickers] = useState<fabric.Image[]>([]);
  const [currentOverlayIndex, setCurrentOverlayIndex] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchImagePath, setTouchImagePath] = useState("");
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const [isIPhone, setIsIPhone] = useState(false);

  const detectIPhone = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone/.test(userAgent);
  };

  const copyOrDownloadImage = async (imagePath: string) => {
    if (copying) return;

    setCopying(true);
    try {
      const response = await fetch(imagePath);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();

      const img = document.createElement("img") as HTMLImageElement;
      img.crossOrigin = "anonymous";
      img.src = URL.createObjectURL(blob);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);

      const canvasBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!canvasBlob) throw new Error("Failed to create blob from canvas");

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            [canvasBlob.type]: canvasBlob,
          }),
        ]);

        toast.success("Copied!", {
          position: "bottom-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      } catch (clipboardError) {
        console.error(
          "Failed to copy to clipboard, attempting download:",
          clipboardError
        );

        // Create a download link
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(canvasBlob);
        downloadLink.download = "buttercat_image.png";

        // Append to the document, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast.success("Image downloaded!", {
          position: "bottom-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (err) {
      console.error("Failed to process image: ", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
      }
      toast.error("Failed to copy or download image", {
        position: "bottom-center",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setCopying(false);
    }
  };

  const loadOverlay = (url: string) => {
    if (!fabricCanvasRef.current) {
      console.error("Canvas not initialized.");
      return;
    }

    const canvas = fabricCanvasRef.current;

    fabric.Image.fromURL(url, (img) => {
      if (!img) {
        console.error("Failed to load image.");
        return;
      }

      const scaleX = 90 / img.width!;
      const scaleY = 90 / img.height!;
      const scale = Math.min(scaleX, scaleY);

      img.scale(scale);

      const xPos = (canvas.width! - 90) / 2;
      const yPos = 50;
      img.set({
        left: xPos,
        top: yPos,
        selectable: true,
        evented: true,
        hasControls: true,
      });

      img.data = { isOverlay: true };

      const existingOverlay = canvas
        .getObjects()
        .find((obj: fabric.Object) => obj.data?.isOverlay);
      if (existingOverlay) {
        canvas.remove(existingOverlay);
      }

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      setOverlay(img);
    });
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    imagePath: string
  ) => {
    e.dataTransfer.setData("text/plain", imagePath);
  };

  const handleDragOver = (e: fabric.IEvent) => {
    e.e.preventDefault();
  };

  const handleDrop = (e: fabric.IEvent) => {
    e.e.preventDefault();
    const originalEvent = e.e as DragEvent;
    const imagePath = originalEvent.dataTransfer?.getData("text");
    if (imagePath) {
      fabric.Image.fromURL(imagePath, (img) => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = originalEvent.clientX - rect.left;
            const y = originalEvent.clientY - rect.top;

            const scaleX = 90 / img.width!;
            const scaleY = 90 / img.height!;
            const scale = Math.min(scaleX, scaleY);

            img.set({
              left: x - 45,
              top: y - 45,
              scaleX: scale,
              scaleY: scale,
              selectable: true,
              hasControls: true,
              hasBorders: true,
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            setStickers((prevStickers) => [...prevStickers, img]);
            canvas.renderAll();
          }
        }
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent, imagePath: string) => {
    if (isIPhone) return;
    e.preventDefault();
    setTouchDragging(true);
    setTouchImagePath(imagePath);
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    document.body.style.overflow = "hidden";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isIPhone) return;
    if (touchDragging) {
      const touch = e.touches[0];
      const newY = touch.clientY;

      const topThreshold = window.innerHeight * 0.3;
      const bottomThreshold = window.innerHeight * 0.7;

      if (newY < topThreshold) {
        smoothScroll(-50);
      } else if (newY > bottomThreshold) {
        smoothScroll(50);
      }

      setTouchPosition({ x: touch.clientX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isIPhone) return;
    if (touchDragging) {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          let x = touchPosition.x - rect.left;
          let y = touchPosition.y - rect.top;

          x = Math.max(0, Math.min(x, rect.width));
          y = Math.max(0, Math.min(y, rect.height));

          fabric.Image.fromURL(touchImagePath, (img) => {
            const scaleX = 90 / img.width!;
            const scaleY = 90 / img.height!;
            const scale = Math.min(scaleX, scaleY);

            img.set({
              left: x - 45,
              top: y - 45,
              scaleX: scale,
              scaleY: scale,
              selectable: true,
              hasControls: true,
              hasBorders: true,
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            setStickers((prevStickers) => [...prevStickers, img]);
            canvas.renderAll();
          });
        }
      }

      setTouchDragging(false);
      setTouchImagePath("");
      document.body.style.overflow = "auto";
    }
  };

  const smoothScroll = (amount: number) => {
    const start = window.pageYOffset;
    const startTime = performance.now();
    const duration = 300;

    const animateScroll = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      if (elapsedTime < duration) {
        window.scrollTo(0, start + (amount * elapsedTime) / duration);
        requestAnimationFrame(animateScroll);
      } else {
        window.scrollTo(0, start + amount);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  const handleFlipOverlay = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (
        activeObject &&
        (activeObject === overlay ||
          stickers.includes(activeObject as fabric.Image))
      ) {
        activeObject.set({
          flipX: !activeObject.flipX,
        });
        requestAnimationFrame(() => canvas.renderAll());
      }
    }
  };

  // const handleNextOverlay = () => {
  //   const nextIndex = (currentOverlayIndex + 1) % elements.length;
  //   setCurrentOverlayIndex(nextIndex);
  //   loadOverlay(elements[nextIndex]);
  // };

  // const handlePreviousOverlay = () => {
  //   const prevIndex =
  //     (currentOverlayIndex - 1 + elements.length) % elements.length;
  //   setCurrentOverlayIndex(prevIndex);
  //   loadOverlay(elements[prevIndex]);
  // };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        const imgObj = new window.Image();
        imgObj.src = event.target!.result as string;

        imgObj.onload = () => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;

          // Clear existing images
          const objects = canvas.getObjects();
          objects.forEach((obj) => {
            if (
              obj.type === "image" &&
              obj !== uploadedImage &&
              obj !== overlay
            ) {
              canvas.remove(obj);
            }
          });

          // Calculate the scaled image size while maintaining aspect ratio
          const { width, height } = canvasSize;
          const imageAspectRatio = imgObj.width! / imgObj.height!;
          const canvasAspectRatio = width / height;
          let scaledWidth, scaledHeight;

          if (imageAspectRatio > canvasAspectRatio) {
            scaledWidth = width;
            scaledHeight = width / imageAspectRatio;
          } else {
            scaledWidth = height * imageAspectRatio;
            scaledHeight = height;
          }

          // Create the image instance and add it to the canvas
          const imgInstance = new fabric.Image(imgObj, {
            left: width / 2,
            top: height / 2,
            scaleX: scaledWidth / imgObj.width!,
            scaleY: scaledHeight / imgObj.height!,
            selectable: false,
            evented: false,
          });

          canvas.add(imgInstance);
          canvas.centerObject(imgInstance);
          canvas.sendToBack(imgInstance);
          canvas.renderAll();

          setUploadedImage(imgInstance);
          setFileUploaded(true);
        };
      };

      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    setUploadedImage(null);
    fileInputRef.current?.click();
  };

  const saveImage = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL({
        format: "png",
        quality: 1,
      });

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "butter_meme.png";
      link.click();
    }
  };

  const handleRemoveImage = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        canvas.remove(activeObject);
        canvas.discardActiveObject();

        // If the removed object was the overlay, set overlay state to null
        if (activeObject === overlay) {
          setOverlay(null);
        }

        // Find the next object to set as active
        const remainingObjects = canvas
          .getObjects()
          .filter((obj) => obj !== uploadedImage);
        if (remainingObjects.length > 0) {
          canvas.setActiveObject(remainingObjects[remainingObjects.length - 1]);
        }
      } else if (uploadedImage) {
        canvas.remove(uploadedImage);
        setUploadedImage(null);
        setFileUploaded(false);

        const remainingObjects = canvas.getObjects();
        if (remainingObjects.length > 0) {
          canvas.setActiveObject(remainingObjects[remainingObjects.length - 1]);
        }
      }
      canvas.renderAll();
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setStickers((prevStickers) =>
      prevStickers.filter((sticker) => canvas?.contains(sticker))
    );
  };

  const handleObjectSelection = (e: fabric.IEvent) => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const selectedObject = e.target;
      if (selectedObject) {
        canvas.setActiveObject(selectedObject);
        canvas.renderAll();

        if (selectedObject.type === "image") {
          if (selectedObject.data?.isOverlay) {
            setOverlay(selectedObject as fabric.Image);
          } else {
            setOverlay(null);
          }
        }
      }
    }
  };

  useEffect(() => {
    setIsIPhone(detectIPhone());
  }, []);

  useEffect(() => {
    const setInitialCanvasSize = () => {
      const newSize = window.innerWidth > 500 ? 400 : 300;
      setCanvasSize({ width: newSize, height: newSize });
    };

    setInitialCanvasSize();
  }, []);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll();
    }
  }, [uploadedImage]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const handleSelection = (e: fabric.IEvent) => {
        const selectedObject = e.target;
        if (selectedObject) {
          canvas.setActiveObject(selectedObject);
          canvas.renderAll();

          if (selectedObject.type === "image") {
            if (selectedObject.data?.isOverlay) {
              setOverlay(selectedObject as fabric.Image);
            }
          }
        } else {
          setOverlay(null);
        }
      };

      canvas.on("selection:created", handleSelection);
      canvas.on("selection:updated", handleSelection);
      canvas.on("selection:cleared", () => setOverlay(null));

      return () => {
        canvas.off("selection:created", handleSelection);
        canvas.off("selection:updated", handleSelection);
        canvas.off("selection:cleared");
      };
    }
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const cleanupStickers = () => {
        setStickers((prevStickers) =>
          prevStickers.filter((sticker) => canvas.contains(sticker))
        );

        const activeObject = canvas.getActiveObject();
        if (
          !activeObject ||
          (activeObject.type === "image" && !activeObject.data?.isOverlay)
        ) {
          if (overlay) {
            canvas.setActiveObject(overlay);
          }
        }

        canvas.renderAll();
      };

      canvas.on("object:removed", cleanupStickers);

      return () => {
        canvas.off("object:removed", cleanupStickers);
      };
    }
  }, [overlay]);

  useEffect(() => {
    if (canvasRef.current) {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasSize.width,
        height: canvasSize.height,
      });
      fabricCanvasRef.current = canvas;

      if (fabricCanvasRef.current) {
        loadOverlay(elements[currentOverlayIndex]);
      }

      canvas.on("dragover", handleDragOver);
      canvas.on("drop", handleDrop);
      canvas.on("selection:created", handleObjectSelection);
      canvas.on("selection:updated", handleObjectSelection);

      canvas.selection = true;

      return () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.off("dragover", handleDragOver);
          fabricCanvasRef.current.off("drop", handleDrop);
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      };
    }
  }, [canvasSize]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <>
      <Head>
        <title>Buttercat | Meme Generator</title>
        <meta
          name="description"
          content="Create and share your own memes using the Buttercat Meme Generator. Customize your memes with stickers and images."
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://buttercatsol.vercel.app/" />
        <meta property="og:title" content="Buttercat Meme Generator" />
        <meta
          property="og:description"
          content="Create and share your own memes using the Buttercat Meme Generator. Customize your memes with stickers and images."
        />
        <meta
          property="og:image"
          content="https://buttercatsol.vercel.app/android-chrome-512x512.png"
        />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:url"
          content="https://buttercatsol.vercel.app/"
        />
        <meta property="twitter:title" content="Buttercat Meme Generator" />
        <meta
          property="twitter:description"
          content="Create and share your own memes using the Buttercat Meme Generator. Customize your memes with stickers and images."
        />
        <meta
          property="twitter:image"
          content="https://buttercatsol.vercel.app/android-chrome-512x512.png"
        />

        {/* Favicon */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />

        {/* Additional SEO tags */}
        <meta
          name="keywords"
          content="meme generator, Buttercat, memes, image editor, stickers"
        />
        <meta name="author" content="Buttercat" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://buttercatsol.vercel.app/" />
      </Head>
      <main
        className={`max-w-[1280px] mx-auto min-h-screen py-[112px] px-10 ${inter.className}`}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="md:w-3/5 lg:w-2/5">
            <Image
              src={logo}
              alt="Buttercat Logo"
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: "100%", height: "auto" }}
            />
            <video
              className="border-[3px] border-[#FFE5BD] rounded-2xl my-8"
              width="100%"
              height="100%"
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
            >
              <source src="/assets/promo.mp4" type="video/mp4" />
            </video>
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 xl:gap-8">
              <Link
                href="https://birdeye.so/token/3dCCbYca3jSgRdDiMEeV5e3YKNzsZAp3ZVfzUsbb4be4?chain=solana"
                className="bg-[#FF6D00] text-[#FFE5BD] text-2xl text-center font-bold border-[3px] border-[#FFE5BD80] hover:border-[#FFE5BD] hover:shadow-[0_0_17px_2px_rgba(255,255,255,0.45)] transition-all duration-150 rounded-full py-3.5 w-full"
              >
                BUY
              </Link>
              <div className="flex justify-between gap-2">
                <Link
                  href="https://t.me/buttercatsol"
                  className="text-butter hover:text-orange transition-colors duration-300"
                >
                  <Telegram className="w-10 h-10 " />
                </Link>
                <Link
                  href="https://x.com/ButtCatSolana"
                  className="text-butter hover:text-orange transition-colors duration-300"
                >
                  <X className="w-10 h-10" />
                </Link>
                <Link
                  href="https://www.tiktok.com/@buttercatsol"
                  className="text-butter hover:text-orange transition-colors duration-300"
                >
                  <TikTok className="w-10 h-10" />
                </Link>
                <Link
                  href="https://www.dextools.io/app/en/solana/pair-explorer/Htnih5T64YYvwbkNDmeac2jbiAe1Gec7s5MCiUjTwUPw?t=1723705980615"
                  className="text-butter hover:text-orange transition-colors duration-300"
                >
                  <DexTools className="w-10 h-10" />
                </Link>
                <Link
                  href="https://dexscreener.com/solana/htnih5t64yyvwbkndmeac2jbiae1gec7s5mciujtwupw"
                  className="text-butter hover:text-orange transition-colors duration-300"
                >
                  <DexScreener className="w-10 h-10" />
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden sm:grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 gap-4 w-full lg:w-3/5">
            {assets.slice(0, 17).map((item, index) => (
              <div
                key={index}
                className={`col-span-${item.span} bg-white border-[3px] border-[#FFE5BD80] rounded-2xl`}
                style={{ gridColumn: `span ${item.span}` }}
                onClick={() => copyOrDownloadImage(item.path)}
              >
                <div className="relative h-[114px]">
                  <Image
                    src={item.path}
                    alt={`Item ${item.id}`}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full rounded-[13px]"
                    draggable
                    onTouchStart={
                      isIPhone
                        ? undefined
                        : (e) => handleTouchStart(e, item.path)
                    }
                    onTouchMove={isIPhone ? undefined : handleTouchMove}
                    onTouchEnd={isIPhone ? undefined : handleTouchEnd}
                    onDragStart={(e) => handleDragStart(e, item.path)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="sm:hidden grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 gap-4 w-full lg:w-3/5">
            {mobileAssets.slice(0, 17).map((item, index) => (
              <div
                key={index}
                className={`col-span-${item.span} bg-white border-[3px] border-[#FFE5BD80] rounded-2xl`}
                style={{ gridColumn: `span ${item.span}` }}
                onClick={() => copyOrDownloadImage(item.path)}
              >
                <div className="relative h-[114px]">
                  <Image
                    src={item.path}
                    alt={`Item ${item.id}`}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full rounded-[13px]"
                    draggable
                    onTouchStart={
                      isIPhone
                        ? undefined
                        : (e) => handleTouchStart(e, item.path)
                    }
                    onTouchMove={isIPhone ? undefined : handleTouchMove}
                    onTouchEnd={isIPhone ? undefined : handleTouchEnd}
                    onDragStart={(e) => handleDragStart(e, item.path)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-full my-[100px]">
          <h1
            className={`text-orange text-center text-2xl sm:text-4xl mb-1 ${lilita.className}`}
          >
            MEME GENERATOR
          </h1>
          <h2
            className={`text-butter text-center text-base sm:text-[1.25rem] ${lilita.className}`}
          >
            Generate your meme with buttercat
          </h2>
          {/* <Canvas /> */}
          <div className="flex flex-col items-center ">
            <div className="flex justify-between items-end w-full mt-6 sm:mt-8 h-[3.25rem]">
              <div className="flex items-center gap-6">
                {/* <button
                  className="bg-butter text-orange hover:p-1.5 sm:hover:p-2.5 border-[3px] border-orange transition-all duration-150 p-1 sm:p-2 rounded-full"
                  onClick={handlePreviousOverlay}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                    />
                  </svg>
                </button>
                <button
                  className="bg-butter text-orange hover:p-1.5 sm:hover:p-2.5 border-[3px] border-orange transition-all duration-150 p-1 sm:p-2 rounded-full"
                  onClick={handleNextOverlay}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button> */}
                <button
                  className="bg-butter text-orange font-bold hover:p-1.5 sm:hover:p-2.5 border-[3px] border-orange transition-all duration-150 p-1 sm:p-2 rounded-md"
                  onClick={handleFlipOverlay}
                  disabled={!fabricCanvasRef.current?.getActiveObject()}
                >
                  FLIP
                </button>
              </div>
              <button
                className="bg-butter text-orange hover:p-1.5 sm:hover:p-2.5 border-[3px] border-orange transition-all duration-150 p-1 sm:p-2 rounded-full"
                onClick={handleRemoveImage}
                disabled={
                  !uploadedImage && !fabricCanvasRef.current?.getActiveObject()
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="3"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="relative w-[300px] min-[500px]:w-[400px] h-[300px] min-[500px]:h-[400px] mx-auto my-3">
              <canvas
                ref={canvasRef}
                className="border-[3px] border-orange rounded-2xl"
                style={{ width: canvasSize.width, height: canvasSize.height }}
                onTouchStart={isIPhone ? undefined : (e) => e.preventDefault()}
                onTouchMove={isIPhone ? undefined : (e) => e.preventDefault()}
                onTouchEnd={isIPhone ? undefined : (e) => e.preventDefault()}
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>
            <div className="grid grid-cols-4 gap-3 w-full mt-0.5 mb-6 sm:mb-8">
              {elements.map((item, index) => (
                <div
                  key={index}
                  className="bg-white border-[3px] border-[#FFE5BD80] rounded-2xl w-full"
                >
                  <div className="relative h-[80px]">
                    <Image
                      src={item}
                      alt={`Item ${index}`}
                      layout="fill"
                      objectFit="cover"
                      className="w-full h-full rounded-[13px]"
                      draggable
                      onTouchStart={
                        isIPhone ? undefined : (e) => handleTouchStart(e, item)
                      }
                      onTouchMove={isIPhone ? undefined : handleTouchMove}
                      onTouchEnd={isIPhone ? undefined : handleTouchEnd}
                      onDragStart={(e) => handleDragStart(e, item)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {!uploadedImage ? (
              <button
                className="bg-butter text-orange text-2xl font-bold border-[3px] border-orange/80 hover:border-orange hover:shadow-[0_0_17px_2px_rgba(255,255,255,0.45)] transition-all duration-150 rounded-full min-w-[192px] py-3.5 w-full sm:w-max"
                onClick={triggerFileInput}
              >
                Add Image
              </button>
            ) : (
              <button
                className="bg-butter text-orange text-2xl font-bold border-[3px] border-orange/80 hover:border-orange hover:shadow-[0_0_17px_2px_rgba(255,255,255,0.45)] transition-all duration-150 rounded-full min-w-[192px] py-3.5 w-full sm:w-max"
                onClick={saveImage}
              >
                Save Image
              </button>
            )}
          </div>
        </div>
        <div className="hidden sm:grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4 mt-4">
          {assets.slice(18).map((item, index) => (
            <div
              key={index}
              className={`col-span-${item.span} bg-white border-[3px] border-[#FFE5BD80] rounded-2xl`}
              style={{ gridColumn: `span ${item.span}` }}
              onClick={() => copyOrDownloadImage(item.path)}
            >
              <div className="relative h-[114px]">
                <Image
                  src={item.path}
                  alt={`Item ${item.id}`}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full rounded-[13px]"
                  draggable
                  onTouchStart={
                    isIPhone ? undefined : (e) => handleTouchStart(e, item.path)
                  }
                  onTouchMove={isIPhone ? undefined : handleTouchMove}
                  onTouchEnd={isIPhone ? undefined : handleTouchEnd}
                  onDragStart={(e) => handleDragStart(e, item.path)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="sm:hidden grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4 mt-4">
          {mobileAssets.slice(18).map((item, index) => (
            <div
              key={index}
              className={`col-span-${item.span} bg-white border-[3px] border-[#FFE5BD80] rounded-2xl`}
              style={{ gridColumn: `span ${item.span}` }}
              onClick={() => copyOrDownloadImage(item.path)}
            >
              <div className="relative h-[114px]">
                <Image
                  src={item.path}
                  alt={`Item ${item.id}`}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full rounded-[13px]"
                  draggable
                  onTouchStart={
                    isIPhone ? undefined : (e) => handleTouchStart(e, item.path)
                  }
                  onTouchMove={isIPhone ? undefined : handleTouchMove}
                  onTouchEnd={isIPhone ? undefined : handleTouchEnd}
                  onDragStart={(e) => handleDragStart(e, item.path)}
                />
              </div>
            </div>
          ))}
        </div>
        {touchDragging && !isIPhone && (
          <div
            style={{
              position: "fixed",
              left: touchPosition.x - 25,
              top: touchPosition.y - 25,
              width: "50px",
              height: "50px",
              backgroundImage: `url(${touchImagePath})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              opacity: 0.7,
              pointerEvents: "none",
              zIndex: 1000,
            }}
          />
        )}
        <ToastContainer
          position="bottom-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </main>
    </>
  );
}
