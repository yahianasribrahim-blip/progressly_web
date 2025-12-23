import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function BentoGrid() {
  return (
    <section className="py-32">
      <MaxWidthWrapper>
        <div className="relative z-10 grid grid-cols-6 gap-3">
          {/* First card - "Tailored" with 100% icon */}
          <div className="relative col-span-full flex overflow-hidden rounded-2xl border bg-background p-8 lg:col-span-2">
            <div className="relative m-auto size-fit">
              <div className="relative flex h-24 w-56 items-center">
                <svg
                  className="absolute inset-0 size-full text-muted-foreground/30"
                  viewBox="0 0 254 104"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3566 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-gradient_indigo-purple mx-auto block w-fit font-heading text-5xl">
                  100%
                </span>
              </div>
              <h2 className="mt-6 text-center font-heading text-3xl md:text-4xl lg:text-[40px]">
                Tailored
              </h2>
              <p className="mt-3 text-center text-muted-foreground text-sm">
                Each analysis comes with all of the data{" "}
                <span className="italic font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  YOU
                </span>{" "}
                need to get your next outlier.
              </p>
            </div>
          </div>

          {/* Second card - "Grow Without Trial and Error" with Instagram + notification */}
          <div className="relative col-span-full overflow-hidden rounded-2xl border bg-background p-8 sm:col-span-3 lg:col-span-2">
            <div>
              <div className="relative mx-auto flex aspect-square size-32 items-center justify-center">
                {/* Instagram icon with +10k notification */}
                <div className="relative">
                  {/* Outer ring */}
                  <div className="absolute -inset-4 rounded-full border-2 border-dashed border-muted-foreground/20 animate-[spin_20s_linear_infinite]"></div>
                  <div className="absolute -inset-8 rounded-full border border-muted-foreground/10"></div>

                  {/* Instagram icon */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
                    <svg
                      className="h-10 w-10 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>

                    {/* +10K notification badge */}
                    <div className="absolute -right-2 -top-2 flex h-8 w-14 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg">
                      +10K
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 space-y-1.5 text-center">
                <h2 className="text-lg font-medium text-foreground">
                  Grow Without Trial and Error
                </h2>
                <p className="text-muted-foreground">
                  Skip the guesswork. We show you exactly what's working in your niche right now.
                </p>
              </div>
            </div>
          </div>

          {/* Third card - "Stop Guessing Your Next Video" with network of play buttons */}
          <div className="relative col-span-full overflow-hidden rounded-2xl border bg-background p-8 sm:col-span-3 lg:col-span-2">
            <div>
              {/* Network of play buttons */}
              <div className="relative h-32 w-full">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 120">
                  {/* Connecting lines - thin black */}
                  <line x1="50" y1="30" x2="100" y2="60" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="100" y1="60" x2="150" y2="40" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="150" y1="40" x2="200" y2="70" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="200" y1="70" x2="250" y2="35" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="80" y1="90" x2="130" y2="70" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="130" y1="70" x2="180" y2="95" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="180" y1="95" x2="220" y2="55" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="100" y1="60" x2="130" y2="70" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="150" y1="40" x2="130" y2="70" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="200" y1="70" x2="180" y2="95" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="30" y1="60" x2="80" y2="90" stroke="black" strokeWidth="1" opacity="0.3" />
                  <line x1="270" y1="80" x2="220" y2="55" stroke="black" strokeWidth="1" opacity="0.3" />
                </svg>

                {/* Play buttons - small */}
                {/* Row 1 */}
                <div className="absolute left-[15%] top-[20%] flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                  <svg className="h-2.5 w-2.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[32%] top-[45%] flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-pink-500 to-rose-500 shadow-sm">
                  <svg className="h-3 w-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[48%] top-[28%] flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                  <svg className="h-3.5 w-3.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[65%] top-[52%] flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
                  <svg className="h-3 w-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[82%] top-[24%] flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
                  <svg className="h-2.5 w-2.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>

                {/* Row 2 */}
                <div className="absolute left-[8%] top-[45%] flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-cyan-500 to-blue-500 shadow-sm">
                  <svg className="h-2 w-2 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[25%] top-[70%] flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-red-500 to-rose-600 shadow-sm">
                  <svg className="h-2.5 w-2.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[42%] top-[55%] flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-sm">
                  <svg className="h-2.5 w-2.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[58%] top-[75%] flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-lime-500 to-green-500 shadow-sm">
                  <svg className="h-3 w-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[72%] top-[40%] flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                  <svg className="h-2.5 w-2.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[88%] top-[62%] flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                  <svg className="h-2.5 w-2.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>

                {/* Row 3 - additional nodes */}
                <div className="absolute left-[18%] top-[85%] flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-orange-500 to-red-500 shadow-sm">
                  <svg className="h-2 w-2 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[35%] top-[12%] flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-teal-500 to-cyan-500 shadow-sm">
                  <svg className="h-2 w-2 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="absolute left-[78%] top-[85%] flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-yellow-500 to-amber-500 shadow-sm">
                  <svg className="h-2 w-2 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>

              <div className="relative z-10 mt-4 space-y-1.5 text-center">
                <h2 className="text-lg font-medium text-foreground">
                  Stop Guessing Your Next Video
                </h2>
                <p className="text-muted-foreground">
                  Clear, actionable recommendations based on what's already performing.
                </p>
              </div>
            </div>
          </div>

          {/* Fourth card - "Consistent Calculated Growth" - same row, full width */}
          <div className="relative col-span-full overflow-hidden rounded-2xl border bg-background p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 space-y-2">
                <div className="relative flex aspect-square size-12 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border dark:border-white/10 dark:bg-white/5 dark:before:border-white/5 dark:before:bg-white/5">
                  <svg
                    className="m-auto size-6"
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      d="M5.5 7c2 0 6.5-3 6.5-3s4.5 3 6.5 3v4.5C18.5 18 12 20 12 20s-6.5-2-6.5-8.5z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-foreground">
                  Consistent Calculated Growth
                </h2>
                <p className="text-muted-foreground">
                  Data-driven insights that help you grow predictably, not randomly.
                </p>
              </div>
              <div className="flex-1 h-32 overflow-hidden rounded-xl border bg-muted/30">
                <svg
                  className="w-full h-full text-indigo-600/60"
                  viewBox="0 0 366 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0 120V90L10 85L20 92L30 80L40 88L50 75L60 82L70 70L80 78L90 65L100 72L110 58L120 68L130 52L140 62L150 48L160 58L170 42L180 55L190 38L200 50L210 32L220 45L230 28L240 42L250 25L260 38L270 22L280 35L290 18L300 32L310 15L320 28L330 12L340 25L350 8L360 22L366 5V120H0Z"
                    fill="url(#paint_growth)"
                  />
                  <path
                    d="M0 90L10 85L20 92L30 80L40 88L50 75L60 82L70 70L80 78L90 65L100 72L110 58L120 68L130 52L140 62L150 48L160 58L170 42L180 55L190 38L200 50L210 32L220 45L230 28L240 42L250 25L260 38L270 22L280 35L290 18L300 32L310 15L320 28L330 12L340 25L350 8L360 22L366 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="paint_growth" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stopColor="currentColor" stopOpacity="0.3" />
                      <stop offset="1" stopColor="currentColor" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
