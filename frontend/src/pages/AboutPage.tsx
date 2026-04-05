import { motion } from 'framer-motion';
import { MapPin, Heart, GraduationCap, Clock, Award } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="section-shell py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <h1 className="mb-4 font-[var(--font-display)] text-4xl font-bold text-ink-900 sm:text-5xl">
          Our Story
        </h1>
        <div className="mx-auto h-1 w-20 rounded-full bg-brand-500" />
      </motion.div>

      {/* Main Story Section */}
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="overflow-hidden rounded-[40px] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80&w=1000"
              alt="Pharmacy Store"
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
          <div className="absolute -bottom-6 -right-6 hidden rounded-3xl bg-brand-600 p-8 text-white shadow-xl sm:block">
            <p className="text-4xl font-bold">19+</p>
            <p className="text-sm opacity-80">Years of Service</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <Clock size={16} />
            Established May 2005
          </div>
          
          <p className="text-lg leading-relaxed text-ink-700">
            Welcome to <span className="font-semibold text-brand-600">Nature Meds</span>. Our journey began in May 2005, founded by my father, 
            <span className="font-semibold text-ink-900"> Late Kamrujjaman Khan</span>. For nearly two decades, we have been a trusted healthcare provider in Murshidabad.
          </p>

          <p className="text-lg leading-relaxed text-ink-700">
            From our humble beginnings as an offline pharmacy, we have grown to embrace the digital age, bringing quality healthcare products directly to your doorstep while maintaining the personal touch our customers have loved for years.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <Heart size={24} />
              </div>
              <h3 className="mb-2 font-semibold text-ink-900">Family-Run</h3>
              <p className="text-sm text-ink-600">Continuing the legacy with care and dedication across generations.</p>
            </div>
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Award size={24} />
              </div>
              <h3 className="mb-2 font-semibold text-ink-900">Trusted Since 2005</h3>
              <p className="text-sm text-ink-600">Over 19 years of expertise in providing genuine medicines.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Leadership/Family Section */}
      <div className="mt-24 space-y-16">
        <div className="text-center">
          <h2 className="font-[var(--font-display)] text-3xl font-bold text-ink-900">Meet Our Team</h2>
          <p className="mt-2 text-ink-600">The hearts and minds behind Nature Meds</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Father */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel overflow-hidden rounded-[40px] text-center"
          >
            <div className="aspect-square w-full bg-surface-100 overflow-hidden">
               <img
                src="/father.png" 
                alt="Late Kamrujjaman Khan"
                className="h-full w-full object-cover transition duration-500"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-ink-900">Late Kamrujjaman Khan</h3>
              <p className="text-brand-600 font-medium">Founder</p>
              <p className="mt-3 text-sm text-ink-600">
                The visionary who started Nature Meds in 2005 with a mission to provide accessible healthcare.
              </p>
            </div>
          </motion.div>

          {/* Mother */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-panel overflow-hidden rounded-[40px] text-center"
          >
            <div className="aspect-square w-full bg-surface-100 overflow-hidden">
               <img
                src="/mother.png"
                alt="Manidipa Khan"
                className="h-full w-full object-cover transition duration-500"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-ink-900">Manidipa Khan</h3>
              <p className="text-brand-600 font-medium">Store Proprietor</p>
              <p className="mt-3 text-sm text-ink-600">
                Currently managing the offline store operations and ensuring every customer receives expert care.
              </p>
            </div>
          </motion.div>

          {/* Mehefuz */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-panel overflow-hidden rounded-[40px] text-center"
          >
            <div className="aspect-square w-full bg-surface-100 overflow-hidden">
               <img
                src="/mehefuz.jpg"
                alt="Mehefuz Alam Khan"
                className="h-full w-full object-cover transition duration-500"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-ink-900">Mehefuz Alam Khan</h3>
              <p className="text-brand-600 font-medium">Online Operations & Delivery</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <GraduationCap size={12} />
                Class 12 Student
              </div>
              <p className="mt-3 text-sm text-ink-600">
                Leading the digital transformation of Nature Meds and handling all online orders and deliveries.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel overflow-hidden rounded-[40px] p-0"
        >
          <div className="grid lg:grid-cols-5">
            <div className="p-8 sm:p-12 lg:col-span-2">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <MapPin size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-ink-900">Visit Our Store</h2>
                  <p className="text-ink-600">Find us in Talgachi, Murshidabad</p>
                </div>
              </div>
              <div className="space-y-4 text-ink-700">
                <p>
                  Our offline store has been a part of the Talgachi community since 2005. We are located at:
                </p>
                <div className="rounded-2xl bg-surface-50 p-4 border border-brand-100">
                   <p className="font-semibold text-ink-900">Nature Med</p>
                   <p className="text-sm">47R7+JR, Murshidabad, Talgachi</p>
                   <p className="text-sm">West Bengal 742149</p>
                </div>
                <p className="text-sm italic text-ink-500">
                  Step in for original medicines, health consultations, and a friendly smile.
                </p>
              </div>
            </div>
            <div className="h-[400px] w-full lg:col-span-3">
              <iframe
                title="Store Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3640.859255981802!2d88.26454439999999!3d24.1415804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39fbd7b86349643b%3A0x13e20cd61e2d817b!2sNature%20Med!5e0!3m2!1sen!2sin!4v1775384232449!5m2!1sen!2sin"
                className="h-full w-full border-0"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
