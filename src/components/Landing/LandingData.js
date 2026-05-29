export const features = [
  {
    icon: 'sync',
    title: 'Broker Auto Sync',
    description: 'Seamlessly connect and sync your trades automatically from major brokers.',
    detailedDescription: 'Stop manual logging. Our secure API integration supports MT4, MT5, and top crypto exchanges. Every trade, including commissions and swaps, is synced in real-time with 99.9% accuracy.',
    image: 'https://images.unsplash.com/photo-1611974714658-66d2c13221a8?auto=format&fit=crop&q=80&w=800',
    color: 'text-blue-400'
  },
  {
    icon: 'upload_file',
    title: 'Manual & CSV Upload',
    description: 'Flexibly import your historical trade data via CSV or manual entry.',
    detailedDescription: 'Bringing years of history from another platform? Our smart CSV mapper recognizes formats from over 50+ brokers. For custom strategies, our manual entry form captures 20+ data points including mental state.',
    image: 'https://images.unsplash.com/photo-1551288049-bbbda536ad89?auto=format&fit=crop&q=80&w=800',
    color: 'text-emerald-400'
  },
  {
    icon: 'auto_awesome',
    title: 'AI Review',
    description: 'Get personalized AI insights and performance critiques for every trade.',
    detailedDescription: 'Our proprietary LLM analyzes your entry, exit, and stop-loss placement against historical patterns. It identifies "Tilt" or "Revenge Trading" before you even realize it yourself.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    color: 'text-purple-400'
  },
  {
    icon: 'play_circle',
    title: 'Replay & Analyze',
    description: 'Replay your past trades bar-by-bar to analyze your decision-making.',
    detailedDescription: 'The ultimate training tool. Re-live any trade in your journal. Hide the future bars and see if you would make the same decision today. Perfect for refining your price action reading skills.',
    image: 'https://images.unsplash.com/photo-1642790103517-1810444a0b8d?auto=format&fit=crop&q=80&w=800',
    color: 'text-amber-400'
  },
  {
    icon: 'science',
    title: 'Backtesting Software',
    description: 'Professional-grade engine to test your strategies against historical data.',
    detailedDescription: 'Don\'t trade on hope. Build and test complex strategies with our backtesting engine. Supports multiple timeframes, tick-level precision, and produces institutional-grade equity curves.',
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
    color: 'text-rose-400'
  },
  {
    icon: 'account_balance_wallet',
    title: 'Funded Account Tracker',
    description: 'Track multiple funded accounts in a single, unified dashboard.',
    detailedDescription: 'Manage your prop firm accounts in one place. Monitor drawdown limits, profit targets, and consistency rules for FTMO, MyForexFunds, and others. Never blow an account due to missed rules again.',
    image: 'https://images.unsplash.com/photo-1621416848440-23690af1fa57?auto=format&fit=crop&q=80&w=800',
    color: 'text-cyan-400'
  },
  {
    icon: 'psychology',
    title: 'Behavioral Tracking',
    description: 'Identify emotional patterns and behavior habits based on your trading stats.',
    detailedDescription: 'Trading is 90% psychology. Our tracker maps your performance to your emotional tags. Discover why you lose on Mondays or why you tend to over-trade after a big win.',
    image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=800',
    color: 'text-indigo-400'
  },
  {
    icon: 'terminal',
    title: 'Strategy Algo',
    description: 'Custom algorithmic conversion for your proven strategies (Selected Users Only).',
    detailedDescription: 'Have a winning manual strategy? Our engineering team helps you convert it into a fully automated EA or Bot. Bridging the gap between manual intuition and algorithmic execution.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?auto=format&fit=crop&q=80&w=800',
    color: 'text-teal-400'
  }
];

export const brokers = [
  { name: 'MT5', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFtXFVyDyhjNhZ0j0CLMPSJbpf0qFfUKR_K6EVU69otLidrN-xtg_tbRwUmdc4RxIfPFrEPJundEAe8ACJhZsmiI-8VghEaVjyau6wSbUVJOFev4eLYcU694uH6i1jeJqU6p0o2H_5xsvEHpPxUhh19ZClXFuCuJidoyG_GmE-l24Hhq2tYSYnGwr2krpObtiu64rkeU8iv7_UC7gMsFB6CAtYTk03dh0TnrOKM77tmjCnOaTb4MpFfBTGiX1qH5QTd6Ve7pso1_rtbeA' },
  { name: 'Binance', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIU9fxM1deCftBCWzZM3G9d6z6xTpNgvwmcRIJ_SA0g5iF5KJ5mZNFbEHOD5jwBkz0b1U9IplG4F3hZiNPz-IkefvUi332skvI06YNWAwfN1scq-nj8TUH54aWK1ok1a8s___wgjaitSPrZd0rXU-pp_c4raz0W47s2CcHqbzxJvXZ1MoNW04w3Wae-qT3hm4IGm8WFxDr0EkMfeXe3wDD5bGUkObS-pjQ_dlvmNRC7ZfjbFfJ7KVywJqtUtKoiFK4fn32U3QXsXHwR0g' },
  { name: 'Bitget', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdKyrf5L-1tIn0VQCEFpr4yHB7m_dCwWGnuIuT1gB86A8YY9Ibf75aHzgIE1q8uoDJNtQXIxQOTQlGZzTZexzi8RGz3crk2pU1mRqYyZzB8skTMZrnbv9Ux3pgJnyShtcuK9yBf-2UU-BV8gCo9StMaKj8XhgdD5cL2z83ffvr9m1wtAs_3RZKcMMIsY2dWoiGjLwmH2FhVbNjzi_y8jp8zJ591yyU5E6U5xCWLE8sdyucjJ2vZv6TfGlXXPmd8iDG4fsS3VgpahjMMJc' },
  { name: 'Coinbase', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXTzfoUl1TFBXAFxGZzaVZI-negW7SKYUla1Rf_Eu1MAxV6RaDIgvkewF_xPH72eajOB0G8G9PXfcaSx6xXi0-SupNDY57gjBLSqG8xv5RfSIlZ83Aw9FuUA6jXEXi2LaC7bNabTtadAK9E1c0s07dLFPTkJep7fm3wrO1bpFuCvFHY_rEgKnKYTuNc8jIcOrvLQSe9vsxG_UYxZVxmI91reoYu-zp6Kh96MNpddWs6JvGorRNk0JKa9Bw0M95KpxvYHhoHj5oH0bmKsw' },
  { name: 'Bybit', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnUFxa3_Mu9f7okfdIrI6bCnk0cZ0i69_Y4hI2pZc72yfw167NEKnHvKpismfpVjo5pr9VMeHOLZdXxs_gWtZyVRJQAU1kwzcBd0U5y-nTPsVk1dKJV4IoYavOeTtOsIZcxdyV0ZrF3IiXHX5tnd0_yvTA-AYD8wIQer30yRY51Xav_bjVWPeH7Xpdy77RMoRS9SmHGItvtc2jw-qFHTkyumzZMM6udVTxyortppfEMFzgP_74edprKdV-_aJqhsYEiG04tGZsfYWOlvE' },
  { name: 'Exness', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWgUGJkFBU-8DWxYa_03kcTmUW68DMc9iTadHdWwTmVROw_DvA1_mL95PVnlf21fEj4dbdAt46_RNx_gqgWrHY6D4uUz_oacuiQHciPMDrDzmZr0b67Sr7mjmIZ9Wds7PDTU5i1eHfCO88oZAN9YW_b8xlyAZ_RmlY0SrQVwZD1DPdGg3mCQHzTuo9FBP7ZzDPfEp-LffKZZy6bSWlYjjOa0Qc8oTBF51tbfZ5BWlEC9vjrmnsSRjHYfD-61QgD0uqV325919swyZeL98' },
  { name: 'XM', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAroI00T4Juols6Fsv9JT_HKGdysUpRMfnxXJJMOroef_z2zTOFkjkaDgUCOE3l73mseD9s-VvKcOtHdYiVuINCxGQOG_UwENblFc7WtYCrhuUtStlfxvduakPNMVB_7d1ljizP3TJMwAK1P2KFd6wYyqCl74a625BoAW-uTXzp_qqUqswc743q6NA7gvmeL-JK9Q8y812Dale2yzmhDWcD-hMjBYqNUDFbQiO4dXr6TbH-04QL3cwi0uQWg9qDEcU8N9RBx7AMU_qu0is' },
  { name: 'IC Markets', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8cJWsCjIAV2Q8N66dprRgItMpf_ofuae1joDIR2fkZEhx7H0ZcJtdKVKbO8mvIpLYGmzysxJjthmeU-dtwfUBu5ca6h1Pp_wcYQkOH61Yb036LIXab8chfeNTszc9azS2LC8Xjd7lNJU0gELjAXQ_goqXUoV8jcl0w4ATIyd9iQblkgDh3ODO-PcSJTCPq_vOWXqfV8xXekXCl3HQ4gmW61zzNpD1vM7FZyeW0SyT6etyz0a8hZZp45glzQvXErQyIbuMumdW88_5UAE' }
];

export const pricingPlans = [
  {
    name: 'Free',
    tagline: 'Essential journal for beginners.',
    price: '$0',
    period: '/mo',
    features: [
      '30 trades per month',
      'Basic analytics',
      'Trade calendar',
      'Standard Setup Tags'
    ],
    lockedFeatures: [
      'Replay Backtesting'
    ],
    buttonText: 'Get Started',
    popular: false
  },
  {
    name: 'Pro',
    tagline: 'For serious daily traders.',
    price: '$29',
    period: '/mo',
    features: [
      'Unlimited trade logs',
      '10 Replay sessions /mo',
      'Advanced psychological tags',
      'MT4/MT5 Auto-sync',
      'Custom Risk Management',
      'Advanced filtering'
    ],
    lockedFeatures: [],
    buttonText: 'Choose Pro',
    popular: true
  },
  {
    name: 'Elite',
    tagline: 'The ultimate edge for professionals.',
    price: '$49',
    period: '/mo',
    features: [
      'Unrestricted performance suite',
      'Unlimited Replay sessions',
      'Multi-Account management',
      'Priority Strategy API',
      'Private 1-on-1 performance review',
      'Priority support'
    ],
    lockedFeatures: [],
    buttonText: 'Choose Elite',
    popular: false
  }
];
