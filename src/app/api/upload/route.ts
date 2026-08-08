import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Netlify environment variables se Cloudinary automatically config ho jayega
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // File ko buffer mein convert karein
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Photo ko Cloudinary par upload karein
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "teacher_uploads" }, (error, result) => {
          if (error || !result) reject(error);
          else resolve(result);
        })
        .end(buffer);
    });

    // Netlify crash nahi hoga, aur direct Cloudinary ka Image URL return hoga
    return NextResponse.json({ url: result.secure_url, success: true });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
