import Link from 'next/link';
import { 
  ArrowRight, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Headphones, 
  RotateCcw, 
  Sparkles,
  Zap,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Home | BrightBuy Marketplace',
  description: 'Shop top quality tech, fashion, and home products with lightning-fast delivery and verified reviews.',
};

export default function Home() {
  const categories = [
    { name: 'Electronics & Audio', icon: Zap, href: '/products?search=audio', desc: 'Headphones, earbuds & smart gadgets' },
    { name: 'Computers & Tech', icon: Sparkles, href: '/products?search=laptop', desc: 'Laptops, accessories & monitors' },
    { name: 'Footwear & Apparel', icon: ShoppingBag, href: '/products?search=shoes', desc: 'Sneakers, running shoes & style' },
    { name: 'Best Deals & New', icon: Tag, href: '/products?sort=price_asc', desc: 'Trending offers & budget picks' },
  ];

  const brands = [
    { name: 'Apple', filter: 'Apple' },
    { name: 'Sony', filter: 'Sony' },
    { name: 'Samsung', filter: 'Samsung' },
    { name: 'Nike', filter: 'Nike' },
    { name: 'Adidas', filter: 'Adidas' },
    { name: 'LG', filter: 'LG' },
  ];

  const features = [
    {
      icon: Truck,
      title: 'Free Fast Delivery',
      desc: 'Free standard shipping on all qualifying orders over $50.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure Checkout',
      desc: 'Protected with industry-grade SSL encryption and secure payments.',
    },
    {
      icon: RotateCcw,
      title: '30-Day Returns',
      desc: 'Hassle-free return policy if you are not 100% satisfied.',
    },
    {
      icon: Headphones,
      title: '24/7 Dedicated Support',
      desc: 'Our customer support team is always ready to assist you.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500 via-indigo-600 to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Discover the Brightest Deals of the Season</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white mb-6">
            Modern Essentials. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
              Exceptional Value.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 font-normal leading-relaxed mb-10">
            Browse our curated marketplace for electronics, fashion, and everyday essentials. Transparent pricing, genuine quality, and lightning-fast delivery.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/products" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-base px-8 h-12 shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-0.5">
                Explore Catalog
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#categories" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-white text-base px-8 h-12 backdrop-blur-sm">
                Browse Categories
              </Button>
            </a>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-16 pt-12 border-t border-slate-800/80 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">100%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Authentic Products</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">&lt; 48 hrs</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Average Dispatch</div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">4.9 / 5.0</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Popular Collections
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Shop by Category
            </h2>
          </div>
          <Link href="/products" className="mt-4 md:mt-0 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 group">
            View all categories
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <Link 
                key={i} 
                href={cat.href}
                className="group relative bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
                    {cat.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Browse items</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Brands */}
      <section className="bg-slate-100/70 dark:bg-zinc-900/40 border-y border-slate-200/60 dark:border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Trusted Global Brands
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {brands.map(b => (
              <Link
                key={b.name}
                href={`/products?brand=${encodeURIComponent(b.filter)}`}
                className="px-6 py-3 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 hover:border-blue-400 shadow-sm transition-all hover:-translate-y-0.5"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Why Shop with BrightBuy
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
            Designed for Seamless Shopping
          </h2>
          <p className="text-slate-600 dark:text-zinc-400 mt-3 text-base">
            Every step from browsing to delivery is built around simplicity, security, and top-tier customer care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100/70 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-14 text-white text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Ready to Upgrade Your Everyday?
            </h2>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              Explore hundreds of verified items, filter by your favorite brands, and check out with ease.
            </p>
            <Link href="/products">
              <Button size="lg" className="bg-white hover:bg-slate-100 text-blue-700 font-bold px-8 h-12 shadow-md hover:scale-105 transition-transform">
                Browse All Products Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
