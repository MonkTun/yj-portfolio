import React from 'react';

export const Resume = () => {
    return (
        <section className="min-h-screen pt-24 px-4 flex flex-col items-center justify-center bg-black">
            <div className="w-full max-w-6xl h-[85vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
                <iframe 
                    src="/resume.pdf" 
                    className="w-full h-full"
                    title="Resume PDF"
                >
                    <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
                        <p className="text-xl mb-4">Your browser does not support viewing PDFs directly.</p>
                        <a 
                            href="/resume.pdf" 
                            download 
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Download Resume
                        </a>
                    </div>
                </iframe>
            </div>
            <div className="mt-6">
                <a 
                    href="/resume.pdf" 
                    download
                    className="text-gray-400 hover:text-white transition-colors underline"
                >
                    Download PDF
                </a>
            </div>
        </section>
    );
};
