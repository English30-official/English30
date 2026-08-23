import { CheckoutOrderData, CheckoutResult, PaymentMethod, PricingPlan } from '../../types';

export interface PaymentGatewayInfo {
  id: string;
  name: string;
  nameAr: string;
  supportedMethods: PaymentMethod[];
  isLive: boolean;
}

export interface PaymentContext {
  plan: PricingPlan;
  finalAmount: number;
  discountAmount: number;
}

export interface IPaymentGateway {
  readonly info: PaymentGatewayInfo;
  process(order: CheckoutOrderData, context: PaymentContext): Promise<CheckoutResult>;
}
