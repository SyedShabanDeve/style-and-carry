/** Loading placeholders that match the shape of what is coming. */

export function Skeleton({ w = '100%', h = 12, r, className = '', style }) {
  return (
    <span
      className={`skel ${className}`.trim()}
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card card-skel" aria-hidden="true">
      <div className="card-img">
        <Skeleton h="100%" r={0} />
      </div>
      <div className="card-b">
        <Skeleton w="35%" h={10} />
        <Skeleton w="80%" h={14} />
        <Skeleton w="55%" h={12} />
        <div className="card-foot">
          <Skeleton w="40%" h={18} />
          <Skeleton w={40} h={40} r={999} />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="wrap pd pd-skel" aria-busy="true" aria-label="Loading product">
      <div className="pd-gal">
        <Skeleton className="pd-main-skel" h="auto" r="var(--r-lg)" />
      </div>
      <div className="pd-b">
        <Skeleton w="25%" h={11} />
        <Skeleton w="75%" h={34} style={{ margin: '14px 0' }} />
        <Skeleton w="35%" h={26} style={{ marginBottom: 22 }} />
        <Skeleton w="100%" h={12} />
        <Skeleton w="90%" h={12} style={{ margin: '8px 0 28px' }} />
        <Skeleton w="100%" h={52} r="var(--r-btn)" />
      </div>
    </div>
  );
}
