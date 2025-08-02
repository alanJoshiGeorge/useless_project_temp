import React, { useState } from "react";
import axios from "axios";

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!resumeFile || !photoFile) {
      setMessage("Please upload both resume and photo.");
      return;
    }

    setLoading(true);
    setMessage("");
    setVideoUrl(null);

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("photo", photoFile);

    try {
      const res = await axios.post("http://127.0.0.1:8000/generate-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.video_url) {
        setVideoUrl(res.data.video_url);
        setMessage("Avatar video created successfully!");
      } else {
        setMessage("Failed to generate avatar video.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("Upload failed. Check your backend and D-ID API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 text-gray-800 flex flex-col items-center px-4 py-10">
      <h1 className="text-4xl font-bold text-purple-600 mb-2 text-center">
        Transform Your Resume with AI
      </h1>
      <p className="text-center mb-6 text-gray-600 max-w-2xl">
        Upload your resume and a photo to get a talking avatar that presents your career summary.
      </p>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl">
        {/* Upload Section */}
        <div className="flex-1 bg-white border border-dashed border-gray-300 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">📤 Upload Resume & Face</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload your resume and a clear front-facing photo to generate your avatar video.
          </p>

          {/* Resume Upload */}
          <div className="mb-4">
            <label className="block font-medium mb-1">📄 Resume (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResumeFile(e.target.files[0])}
              className="block w-full border border-gray-300 rounded p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo Upload */}
          <div className="mb-4">
            <label className="block font-medium mb-1">🖼️ Face Photo (JPG/PNG)</label>
            <input
              type="file"
              accept="image/png, image/jpeg"
              onChange={(e) => setPhotoFile(e.target.files[0])}
              className="block w-full border border-gray-300 rounded p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={loading || !resumeFile || !photoFile}
            className={`w-full px-4 py-2 rounded font-medium text-white ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Processing..." : "Generate Avatar Video"}
          </button>

          {message && <p className="text-center mt-4 text-sm text-gray-700">{message}</p>}
        </div>

        {/* Avatar Video Preview */}
        <div className="flex-1 bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">🎥 Avatar Video Preview</h2>
          <p className="text-sm text-gray-500 mb-4">
            Watch your digital self present your career summary.
          </p>

          <div className="h-96 bg-gray-100 flex items-center justify-center rounded">
        {videoUrl ? (
  <video controls autoPlay className="w-full h-full rounded">
    <source src={videoUrl} type="video/mp4" />
    Your browser does not support the video tag.
  </video>
) : (
  <span className="text-gray-400 text-xl">📷 No video yet</span>
)}

        </div>

        </div>
      </div>
    </div>
  );
}

export default App;
