interface VideoPlayerProps {
  url: string
  poster?: string
}

export function VideoPlayer({ url, poster }: VideoPlayerProps) {
  // Check if it's a YouTube URL
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  
  // Check if it's a direct video file
  const isVideoFile = /\.(mp4|mov|webm|avi)$/i.test(url)

  if (!url) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-400">No video available</p>
      </div>
    )
  }

  if (isYouTube) {
    // Extract video ID from YouTube URL
    let videoId = ''
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        videoId = match[1]
        break
      }
    }

    if (videoId) {
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full rounded-lg"
          />
        </div>
      )
    }
  }

  if (isVideoFile) {
    // Direct video file
    return (
      <div className="rounded-lg overflow-hidden bg-black">
        <video
          src={url}
          poster={poster}
          controls
          crossOrigin="anonymous"
          className="w-full max-h-80"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // For other URLs, try to embed or show a link
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className="text-gray-400 mb-2">Video URL</p>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline text-sm break-all"
      >
        {url}
      </a>
    </div>
  )
}

export default VideoPlayer
