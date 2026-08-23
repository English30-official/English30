import { CheckoutOrderData, CheckoutResult, PaymentMethod } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { subscriptionsService } from './subscriptionsServiceSupabase';

export interface PaymentGatewayProvider { id:string; name:string; nameAr:string; supportedMethods:PaymentMethod[]; isLive:boolean; }

class PaymentServiceProduction {
 private provider:PaymentGatewayProvider={id:'paytabs',name:'PayTabs',nameAr:'PayTabs / Mada / Apple Pay',supportedMethods:['mada','apple_pay','credit_card','stc_pay'],isLive:false};
 async processCheckout(order:CheckoutOrderData):Promise<CheckoutResult>{
  if(!isSupabaseConfigured)return {success:false,messageAr:'خدمة الدفع غير مهيأة. يرجى المحاولة لاحقاً.'};
  const user=(await getSupabaseClient().auth.getUser()).data.user;
  if(!user)return {success:false,messageAr:'يجب تسجيل الدخول قبل إتمام الاشتراك.'};
  const plan=await subscriptionsService.getPlanById(order.planId);
  if(!plan)return {success:false,messageAr:'لم يتم العثور على الباقة.'};
  const base=order.billingCycle==='yearly'?plan.priceYearly:plan.priceMonthly;
  let discount=0;if(order.couponCode){const check=await subscriptionsService.validateCoupon(order.couponCode);if(check.valid)discount=Math.round(base*check.discountPercentage/100);}
  const amount=Math.max(0,base-discount);
  const {error}=await getSupabaseClient().from('payments').insert({user_id:user.id,amount,currency:plan.currency??'SAR',status:'pending',provider:this.provider.id,metadata:{plan_id:plan.id,billing_cycle:order.billingCycle,payment_method:order.paymentMethod,coupon_code:order.couponCode??null,customer_email:order.customerInfo.email}});
  if(error)throw error;
  return {success:false,amountPaidSAR:amount,discountAmountSAR:discount,messageAr:'تم إنشاء طلب الدفع، لكن بوابة الدفع الحقيقية لم تُفعّل بعد. لم يتم احتساب الاشتراك كمدفوع.'};
 }
 getPaymentMethods(){return [{id:'mada' as PaymentMethod,nameAr:'بطاقة مدى (Mada)',descriptionAr:'الدفع ببطاقة مدى',icon:'💳'},{id:'apple_pay' as PaymentMethod,nameAr:'Apple Pay',descriptionAr:'الدفع عبر Apple Pay',icon:'🍏'},{id:'credit_card' as PaymentMethod,nameAr:'Visa / MasterCard',descriptionAr:'البطاقات الائتمانية',icon:'💳'},{id:'stc_pay' as PaymentMethod,nameAr:'STC Pay',descriptionAr:'المحفظة الرقمية',icon:'📱'}];}
 getProviderInfo(){return {...this.provider};}
}
export const paymentService=new PaymentServiceProduction();