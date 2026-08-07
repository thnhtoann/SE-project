import IconAward from '@/components/icon/icon-award';
import IconStar from '@/components/icon/icon-star';
import { MembershipTier } from '@/types/admin';

// Bronze/Silver/Gold are medal tiers, so they share the medal icon and differ by
// metal colour. VIP sits above the medal ladder, so it gets its own icon.
const TIER_STYLE: Record<MembershipTier, { className: string; Icon: typeof IconAward }> = {
    Bronze: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', Icon: IconAward },
    Silver: { className: 'bg-slate-200 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300', Icon: IconAward },
    Gold: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', Icon: IconAward },
    VIP: { className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400', Icon: IconStar },
};

const TierBadge = ({ tier }: { tier: MembershipTier }) => {
    const { className, Icon } = TIER_STYLE[tier];

    return (
        <span className={`badge inline-flex items-center gap-1 ${className}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {tier}
        </span>
    );
};

export default TierBadge;
