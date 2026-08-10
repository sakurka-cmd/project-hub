'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';

export function BondYieldCalculator() {
  const [price, setPrice] = useState<string>('');
  const [nkd, setNkd] = useState<string>('');
  const [coupon, setCoupon] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    const priceNum = parseFloat(price.replace(',', '.'));
    const nkdNum = parseFloat(nkd.replace(',', '.'));
    const couponNum = parseFloat(coupon.replace(',', '.'));

    if (!isNaN(priceNum) && !isNaN(nkdNum) && !isNaN(couponNum) && couponNum !== 0) {
      // Формула: Current Yield = (Цена + НКД) / Годовой купон × 100%
      const yieldValue = ((priceNum + nkdNum) / couponNum) * 100;
      setResult(yieldValue);
    } else {
      setResult(null);
    }
  }, [price, nkd, coupon]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <CardTitle>Калькулятор ТКД облигации</CardTitle>
        </div>
        <CardDescription>
          Расчет текущей доходности по полной цене
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="price">Цена облигации (в %)</Label>
          <Input
            id="price"
            type="number"
            placeholder="Например: 95.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="0.01"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nkd">НКД (накопленный купонный доход)</Label>
          <Input
            id="nkd"
            type="number"
            placeholder="Например: 3.25"
            value={nkd}
            onChange={(e) => setNkd(e.target.value)}
            step="0.01"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coupon">Годовой купон</Label>
          <Input
            id="coupon"
            type="number"
            placeholder="Например: 8.5"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            step="0.01"
          />
        </div>

        {result !== null && (
          <div className="pt-4 mt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Текущая доходность (ТКД)</p>
              <p className="text-3xl font-bold text-primary">{result.toFixed(2)}%</p>
            </div>
            <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">Формула:</p>
              <p className="font-mono text-xs mt-1">
                ТКД = (Цена + НКД) / Годовой купон × 100%
              </p>
              <p className="font-mono text-xs mt-1">
                ТКД = ({price || '0'} + {nkd || '0'}) / {coupon || '1'} × 100% = {result.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
