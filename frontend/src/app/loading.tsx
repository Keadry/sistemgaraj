import Navbar from '@/components/Navbar';
import { SkeletonBuildGrid, SkeletonLine } from '@/components/Skeleton';

export default function HomeLoading() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <section className="pt-10 pb-8 md:pt-14 md:pb-12 border-b border-hairline/60">
          <SkeletonLine className="h-10 w-2/3 max-w-md" />
          <SkeletonLine className="h-4 w-1/2 max-w-sm mt-4" />
        </section>
        <section className="pt-10">
          <SkeletonBuildGrid count={10} />
        </section>
      </div>
    </main>
  );
}
