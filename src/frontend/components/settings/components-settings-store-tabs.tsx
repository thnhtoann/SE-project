'use client';
import IconCashBanknotes from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconGlobe from '@/components/icon/icon-globe';
import IconHome from '@/components/icon/icon-home';
import IconPhoneCall from '@/components/icon/icon-phone-call';
import IconRouter from '@/components/icon/icon-router';
import IconShoppingBag from '@/components/icon/icon-shopping-bag';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import { MARKETPLACE_CHANNEL_SETTINGS, PAYMENT_METHOD_SETTINGS, STORE_INFORMATION } from '@/data/mock-settings';
import { getTranslation } from '@/i18n';
import { BusinessSector, MarketplaceChannelSetting, PaymentMethod, PaymentMethodSetting } from '@/types/admin';
import { ChangeEvent, FC, useState } from 'react';

type SettingsTab = 'store-information' | 'payment-methods' | 'omnichannel';

type IconComponent = FC<{ className?: string; fill?: boolean }>;

const paymentMethodLabelKey: Record<PaymentMethod, string> = {
    Cash: 'cash',
    Card: 'payment_method_card',
    MoMo: 'payment_method_momo',
    'Online Banking': 'payment_method_online_banking',
};

const paymentMethodIcon: Record<PaymentMethod, IconComponent> = {
    Cash: IconCashBanknotes,
    Card: IconCreditCard,
    MoMo: IconPhoneCall,
    'Online Banking': IconRouter,
};

const paymentMethodIconClass: Record<PaymentMethod, string> = {
    Cash: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Card: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    MoMo: 'bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light',
    'Online Banking': 'bg-primary-light text-primary dark:bg-primary dark:text-primary-light',
};

// Grouped by channel type since these are demo entries, not licensed brand marks:
// delivery apps get the bag icon, marketplaces get the cart icon.
const deliveryChannels = new Set(['GrabMart', 'ShopeeFood', 'BeMart']);

const channelIcon = (channel: string): IconComponent => (deliveryChannels.has(channel) ? IconShoppingBag : IconShoppingCart);

const channelIconClass = (channel: string) =>
    deliveryChannels.has(channel)
        ? 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light'
        : 'bg-info-light text-info dark:bg-info dark:text-info-light';

const businessSectorLabelKey: Record<BusinessSector, string> = {
    'Grocery Store': 'sector_grocery_store',
    'Convenience Store': 'sector_convenience_store',
    Supermarket: 'sector_supermarket',
    Minimart: 'sector_minimart',
    Pharmacy: 'sector_pharmacy',
    'Restaurant / F&B': 'sector_restaurant_fnb',
    Bakery: 'sector_bakery',
    Electronics: 'sector_electronics',
    'Fashion & Apparel': 'sector_fashion_apparel',
    Other: 'sector_other',
};

const businessSectors = Object.keys(businessSectorLabelKey) as BusinessSector[];

const ComponentsSettingsStoreTabs = () => {
    const { t } = getTranslation();
    const [tab, setTab] = useState<SettingsTab>('store-information');
    const [storeInfo, setStoreInfo] = useState(STORE_INFORMATION);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>(PAYMENT_METHOD_SETTINGS);
    const [channels, setChannels] = useState<MarketplaceChannelSetting[]>(MARKETPLACE_CHANNEL_SETTINGS);

    const changeStoreInfo = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setStoreInfo((prev) => ({ ...prev, [id]: value }));
    };

    const changeLogo = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setStoreInfo((prev) => ({ ...prev, logoUrl: reader.result as string }));
        reader.readAsDataURL(file);
    };

    const togglePaymentMethod = (method: PaymentMethod) => {
        setPaymentMethods((prev) => prev.map((pm) => (pm.method === method ? { ...pm, enabled: !pm.enabled } : pm)));
    };

    const changePaymentAccountDetail = (method: PaymentMethod, value: string) => {
        setPaymentMethods((prev) => prev.map((pm) => (pm.method === method ? { ...pm, accountDetail: value } : pm)));
    };

    const toggleChannel = (channel: string) => {
        setChannels((prev) => prev.map((c) => (c.channel === channel ? { ...c, connected: !c.connected } : c)));
    };

    const changeChannelPartnerId = (channel: string, value: string) => {
        setChannels((prev) => prev.map((c) => (c.channel === channel ? { ...c, storePartnerId: value } : c)));
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('store_settings')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <ul className="mb-5 overflow-y-auto whitespace-nowrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a] sm:flex">
                    <li className="inline-block">
                        <button
                            type="button"
                            onClick={() => setTab('store-information')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tab === 'store-information' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconHome className="h-5 w-5" />
                            {t('store_information')}
                        </button>
                    </li>
                    <li className="inline-block">
                        <button
                            type="button"
                            onClick={() => setTab('payment-methods')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tab === 'payment-methods' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconDollarSignCircle className="h-5 w-5" />
                            {t('payment_methods')}
                        </button>
                    </li>
                    <li className="inline-block">
                        <button
                            type="button"
                            onClick={() => setTab('omnichannel')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tab === 'omnichannel' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconGlobe className="h-5 w-5" />
                            {t('omnichannel_marketplace')}
                        </button>
                    </li>
                </ul>

                {tab === 'store-information' && (
                    <form className="panel" onSubmit={(e) => e.preventDefault()}>
                        <h5 className="mb-5 text-lg font-semibold">{t('general_information')}</h5>
                        <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                            <img src={storeInfo.logoUrl} alt="store logo preview" className="h-20 w-20 rounded-md border border-[#ebedf2] object-contain p-2 dark:border-[#1b2e4b]" />
                            <div>
                                <label htmlFor="logo">{t('store_logo')}</label>
                                <input id="logo" type="file" accept="image/*" className="form-input p-1 text-xs" onChange={changeLogo} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="storeName">{t('store_name')}</label>
                                <input id="storeName" type="text" className="form-input" value={storeInfo.storeName} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="businessSector">{t('business_sector')}</label>
                                <select id="businessSector" className="form-select" value={storeInfo.businessSector} onChange={changeStoreInfo}>
                                    {businessSectors.map((sector) => (
                                        <option key={sector} value={sector}>
                                            {t(businessSectorLabelKey[sector])}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="taxId">{t('tax_id')}</label>
                                <input id="taxId" type="text" className="form-input" value={storeInfo.taxId} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="phone">{t('phone')}</label>
                                <input id="phone" type="text" className="form-input" value={storeInfo.phone} onChange={changeStoreInfo} dir="ltr" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="email">{t('email')}</label>
                                <input id="email" type="email" className="form-input" value={storeInfo.email} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="address">{t('address')}</label>
                                <input id="address" type="text" className="form-input" value={storeInfo.address} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="city">{t('city')}</label>
                                <input id="city" type="text" className="form-input" value={storeInfo.city} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="currency">{t('currency')}</label>
                                <input id="currency" type="text" className="form-input" value={storeInfo.currency} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="timezone">{t('timezone')}</label>
                                <input id="timezone" type="text" className="form-input" value={storeInfo.timezone} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="openingTime">{t('opening_time')}</label>
                                <input id="openingTime" type="time" className="form-input" value={storeInfo.openingTime} onChange={changeStoreInfo} />
                            </div>
                            <div>
                                <label htmlFor="closingTime">{t('closing_time')}</label>
                                <input id="closingTime" type="time" className="form-input" value={storeInfo.closingTime} onChange={changeStoreInfo} />
                            </div>
                        </div>
                        <div className="mt-5">
                            <button type="submit" className="btn btn-primary">
                                {t('save')}
                            </button>
                        </div>
                    </form>
                )}

                {tab === 'payment-methods' && (
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold">{t('accepted_payment_methods')}</h5>
                            <p className="text-white-dark">{t('accepted_payment_methods_description')}</p>
                        </div>
                        <div>
                            {paymentMethods.map((pm, index) => {
                                const Icon = paymentMethodIcon[pm.method];
                                return (
                                <div key={pm.method} className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-center ${index !== paymentMethods.length - 1 ? 'border-b border-[#ebedf2] dark:border-[#1b2e4b]' : ''}`}>
                                    <div className="flex items-center gap-3 sm:w-56">
                                        <div className={`grid h-11 w-11 shrink-0 place-content-center rounded-full ${paymentMethodIconClass[pm.method]}`}>
                                            <Icon className="h-5 w-5" fill />
                                        </div>
                                        <div>
                                            <h6 className="text-[15px] font-bold text-[#515365] dark:text-white-dark">{t(paymentMethodLabelKey[pm.method])}</h6>
                                            <span className={`badge mt-1 ${pm.enabled ? 'bg-success-light text-success dark:bg-success dark:text-success-light' : 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]'}`}>
                                                {pm.enabled ? t('enabled') : t('disabled')}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('enter_merchant_account_id')}
                                        className="form-input flex-1"
                                        value={pm.accountDetail}
                                        disabled={!pm.enabled}
                                        onChange={(e) => changePaymentAccountDetail(pm.method, e.target.value)}
                                    />
                                    <label className="relative h-6 w-12 shrink-0">
                                        <input
                                            type="checkbox"
                                            className="peer absolute z-10 h-full w-full cursor-pointer opacity-0"
                                            checked={pm.enabled}
                                            onChange={() => togglePaymentMethod(pm.method)}
                                        />
                                        <span className="block h-full rounded-full bg-[#ebedf2] before:absolute before:bottom-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-all before:duration-300 peer-checked:bg-primary peer-checked:before:left-7 dark:bg-dark dark:before:bg-white-dark dark:peer-checked:before:bg-white"></span>
                                    </label>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === 'omnichannel' && (
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold">{t('connected_channels')}</h5>
                            <p className="text-white-dark">{t('connected_channels_description')}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {channels.map((c) => {
                                const Icon = channelIcon(c.channel);
                                return (
                                <div key={c.channel} className="rounded-md border border-[#ebedf2] p-4 dark:border-[#1b2e4b]">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`grid h-11 w-11 shrink-0 place-content-center rounded-full ${channelIconClass(c.channel)}`}>
                                                <Icon className="h-5 w-5" fill />
                                            </div>
                                            <h6 className="text-[15px] font-bold text-[#515365] dark:text-white-dark">{c.channel}</h6>
                                        </div>
                                        <span
                                            className={`badge ${c.connected ? 'bg-success-light text-success dark:bg-success dark:text-success-light' : 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]'}`}
                                        >
                                            {c.connected ? t('connected') : t('not_connected')}
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor={`channel-${c.channel}`}>{t('store_partner_id')}</label>
                                        <input
                                            id={`channel-${c.channel}`}
                                            type="text"
                                            placeholder={t('enter_store_partner_id')}
                                            className="form-input"
                                            value={c.storePartnerId}
                                            disabled={!c.connected}
                                            onChange={(e) => changeChannelPartnerId(c.channel, e.target.value)}
                                        />
                                    </div>
                                    <button type="button" onClick={() => toggleChannel(c.channel)} className={`btn ${c.connected ? 'btn-outline-danger' : 'btn-primary'} w-full`}>
                                        {c.connected ? t('disconnect') : t('connect')}
                                    </button>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComponentsSettingsStoreTabs;
