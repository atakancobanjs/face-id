import { useEffect, useRef, useState } from "react";
import { Camera, AlertCircle } from "lucide-react";

const EmotionDetector = () => {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [emotions, setEmotions] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [modelsLoaded, setModelsLoaded] = useState(false);
	const [scriptLoaded, setScriptLoaded] = useState(false);

	// Face-API.js script'ini yükle
	useEffect(() => {
		const script = document.createElement("script");
		script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
		script.async = true;
		script.onload = () => setScriptLoaded(true);
		script.onerror = () => setError("Face-API.js yüklenemedi");
		document.head.appendChild(script);

		return () => {
			document.head.removeChild(script);
		};
	}, []);

	useEffect(() => {
		if (!scriptLoaded) return;

		const loadModels = async () => {
			try {
				setIsLoading(true);

				// Face-api.js kütüphanesini yükle
				await Promise.all([
					window.faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"),
					window.faceapi.nets.faceExpressionNet.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"),
				]);

				setModelsLoaded(true);
				setIsLoading(false);
			} catch (err) {
				setError("Modeller yüklenirken hata oluştu: " + err.message);
				setIsLoading(false);
			}
		};

		loadModels();
	}, [scriptLoaded]);

	useEffect(() => {
		if (!modelsLoaded) return;

		const startVideo = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { width: 640, height: 480 },
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			} catch (err) {
				setError("Kameraya erişim izni verilmedi veya kamera bulunamadı.");
			}
		};

		startVideo();

		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
			}
		};
	}, [modelsLoaded]);

	useEffect(() => {
		if (!modelsLoaded || !videoRef.current) return;

		const detectEmotions = async () => {
			const video = videoRef.current;
			const canvas = canvasRef.current;

			if (!video || !canvas || video.paused || video.ended) return;

			const detection = await window.faceapi.detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions()).withFaceExpressions();

			if (detection) {
				const dims = window.faceapi.matchDimensions(canvas, video, true);
				const resizedDetection = window.faceapi.resizeResults(detection, dims);

				const ctx = canvas.getContext("2d");
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				// Yüz çerçevesini çiz
				window.faceapi.draw.drawDetections(canvas, resizedDetection);

				setEmotions(detection.expressions);
			} else {
				setEmotions(null);
			}
		};

		const interval = setInterval(detectEmotions, 100);
		return () => clearInterval(interval);
	}, [modelsLoaded]);

	const getEmotionColor = (emotion) => {
		const colors = {
			happy: "bg-green-500",
			sad: "bg-blue-500",
			angry: "bg-red-500",
			neutral: "bg-gray-500",
			surprised: "bg-yellow-500",
			disgusted: "bg-purple-500",
			fearful: "bg-orange-500",
		};
		return colors[emotion] || "bg-gray-500";
	};

	const getEmotionLabel = (emotion) => {
		const labels = {
			happy: "Mutlu",
			sad: "Üzgün",
			angry: "Kızgın",
			neutral: "Nötr",
			surprised: "Şaşkın",
			disgusted: "İğrenmiş",
			fearful: "Korkmuş",
		};
		return labels[emotion] || emotion;
	};

	const getDominantEmotion = () => {
		if (!emotions) return null;
		let maxEmotion = "";
		let maxValue = 0;

		Object.keys(emotions).forEach((emotion) => {
			if (emotions[emotion] > maxValue) {
				maxValue = emotions[emotion];
				maxEmotion = emotion;
			}
		});

		return { emotion: maxEmotion, value: maxValue };
	};

	const dominant = getDominantEmotion();

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-0 select-none">
			<div className="w-full max-w-6xl flex items-center justify-center flex-col">
				<div className="text-center mb-6 md:mb-8">
					<h1 className="text-2xl md:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2 md:gap-3">
						<Camera className="w-6 h-6 md:w-10 md:h-10" />
						Yüz İfadesi Duygu Analizi
					</h1>
					<p className="text-sm md:text-base text-gray-400">Kameranız ile gerçek zamanlı duygu tespiti</p>
				</div>

				{error && (
					<div className="w-full max-w-4xl bg-red-900/30 border border-red-500/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
						<p className="text-sm md:text-base text-red-300">{error}</p>
					</div>
				)}

				{isLoading && (
					<div className="text-center text-gray-300 mb-4 md:mb-6">
						<div className="inline-block animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-4 border-gray-700 border-t-gray-300 mb-3 md:mb-4"></div>
						<p className="text-sm md:text-base">Modeller yükleniyor...</p>
					</div>
				)}

				<div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-4 md:p-6 shadow-2xl border border-gray-700/50 flex flex-col lg:flex-row w-full gap-4 md:gap-5 items-center justify-center max-w-6xl">
					<div className="relative w-full lg:w-2/3">
						<video
							ref={videoRef}
							autoPlay
							muted
							playsInline
							className="w-full rounded-lg h-full object-cover max-h-96 lg:max-h-none lg:object-contain"
							onLoadedMetadata={() => {
								if (videoRef.current && canvasRef.current) {
									canvasRef.current.width = videoRef.current.videoWidth;
									canvasRef.current.height = videoRef.current.videoHeight;
								}
							}}
						/>
						<canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
					</div>

					<div className="w-full lg:w-1/3 flex flex-col gap-4 md:gap-6">
						{dominant && (
							<div className="flex flex-col items-center justify-center gap-2 bg-gray-900/60 rounded-lg p-3 md:p-4 text-center border border-gray-700/50">
								<p className="text-gray-400 text-xs md:text-sm">Baskın Duygu</p>
								<p className="text-2xl md:text-3xl font-bold text-white">{getEmotionLabel(dominant.emotion)}</p>
								<p className="text-gray-500 text-xs md:text-sm">%{(dominant.value * 100).toFixed(1)}</p>
							</div>
						)}

						{emotions && (
							<div className="flex flex-col items-center justify-center w-full">
								<h3 className="text-gray-200 font-semibold mb-3 text-sm md:text-base">Tüm Duygular</h3>
								<div className="w-full flex flex-col items-center justify-center gap-2 md:gap-3">
									{Object.keys(emotions).map((emotion) => (
										<div key={emotion} className="w-full flex flex-col gap-1">
											<div className="flex justify-between text-xs md:text-sm">
												<span className="text-gray-300">{getEmotionLabel(emotion)}</span>
												<span className="text-gray-400">%{(emotions[emotion] * 100).toFixed(1)}</span>
											</div>
											<div className="w-full bg-gray-900/60 rounded-full h-1.5 md:h-2 overflow-hidden border border-gray-700/30">
												<div
													className={`h-full ${getEmotionColor(emotion)} transition-all duration-300`}
													style={{ width: `${emotions[emotion] * 100}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{!emotions && !isLoading && !error && (
							<div className="text-center text-gray-400 py-6 md:py-8">
								<p className="text-sm md:text-base">Kameranın önüne geçin...</p>
								<p className="text-xs md:text-sm mt-2">Yüz algılanmadı</p>
							</div>
						)}
					</div>
				</div>

				<div className="mt-4 md:mt-6 text-center text-gray-600 text-xs md:text-sm">
					<p>Face API kullanılarak geliştirilmiştir</p>
				</div>
			</div>
		</div>
	);
};

export default EmotionDetector;
