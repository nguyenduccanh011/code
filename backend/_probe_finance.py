import sys
sys.stdout.reconfigure(encoding='utf-8')
from vnstock import Finance
fin = Finance('FPT')
print('Finance dir size:', len(dir(fin)))
attrs = dir(fin)
print('has methods:', [m for m in ['financials','statement','income_statement','balance_sheet','cashflow_statement','ratios','ratio'] if hasattr(fin, m)])
for name in ['financials','statement','income_statement','balance_sheet','cashflow_statement','ratios','ratio']:
    if hasattr(fin, name):
        try:
            res = getattr(fin, name)()
            print(name, '->', type(res), getattr(res, 'shape', None))
        except Exception as e:
            print(name, 'ERR', e)
