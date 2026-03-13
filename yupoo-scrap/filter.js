/**
 * Módulo de Filtragem e Categorização de Produtos Yupoo
 * Extrai: categoria, preço, marca, cor dos títulos dos produtos
 */

// ============================================
// MAPEAMENTO DE MARCAS (padrões ofuscados -> nome real)
// ============================================
const BRAND_PATTERNS = [
    // Ralph Lauren
    { patterns: ['RA⭐⭐H LA⭐RE⭐', 'RALPH LAUREN', 'POLO RL', 'RALPH', 'R⭐LPH L⭐UREN'], brand: 'Ralph Lauren' },

    // Nike
    { patterns: ['NK', 'N⭐KE', 'N1KE', 'NIKE', 'N⭐K⭐', 'NOCTA'], brand: 'Nike' },

    // Loro Piana
    { patterns: ['Loropiana', 'LOROPIANA', 'L⭐RO P⭐A⭐A'], brand: 'Loro Piana' },

    // Carhartt
    { patterns: ['CARHARTT', 'C⭐R⭐A⭐TT'], brand: 'Carhartt' },

    // Adidas
    { patterns: ['AD', 'ADIDAS', 'AD⭐DAS', 'A⭐IDAS', 'ADI', 'ADID⭐S'], brand: 'Adidas' },

    // The North Face
    { patterns: ['TNF', 'THE NORTH FACE', 'NORTH FACE', 'T⭐E N⭐RTH F⭐CE', 'T⭐F', 'NORTHFACE'], brand: 'The North Face' },

    // Supreme
    { patterns: ['SUP', 'SUPREME', 'S⭐PREME', 'S⭐⭐R⭐⭐E', 'SUP⭐REME', 'SPR'], brand: 'Supreme' },

    // Louis Vuitton
    { patterns: ['LV', 'LOUIS VUITTON', 'L⭐UIS V⭐ITTON', 'VUITTON'], brand: 'Louis Vuitton' },

    // Gucci
    { patterns: ['GUCCI', 'G⭐CCI', 'GUCC⭐', 'G⭐C⭐I'], brand: 'Gucci' },

    // Balenciaga
    { patterns: ['BAL', 'BALENCIAGA', 'B⭐LENCIAGA', 'BALENCI', 'B⭐L⭐⭐⭐IA⭐A'], brand: 'Balenciaga' },

    // Prada
    { patterns: ['PRADA', 'PR⭐DA', 'PRA', 'PR⭐D⭐', 'P⭐A⭐A'], brand: 'Prada' },

    // Off-White
    { patterns: ['OFF-WHITE', 'OFF WHITE', 'OFFWHITE', 'O⭐F WH⭐TE'], brand: 'Off-White' },

    // Dior
    { patterns: ['DIOR', 'D⭐OR', 'DI⭐R', 'CD', 'CHRISTIAN DIOR'], brand: 'Dior' },

    // Versace
    { patterns: ['VERSACE', 'VERS⭐CE', 'VERSA', 'VRS'], brand: 'Versace' },

    // Burberry
    { patterns: ['BURBERRY', 'BBR', 'B⭐RBERRY', 'BURB', 'BB'], brand: 'Burberry' },

    // Stone Island
    { patterns: ['STONE ISLAND', 'S⭐⭐⭐E I⭐⭐A⭐ND', 'ST⭐NE', 'STONEISLAND'], brand: 'Stone Island' },

    // Loewe
    { patterns: ['L⭐E⭐ ⭐', 'LOEW', 'L⭐E⭐⭐', 'LOEWE'], brand: 'Loewe' },

    // Beams
    { patterns: ['BE⭐⭐S'], brand: 'Beams' },

    // Moncler
    { patterns: ['MONCLER', 'MONC', 'M⭐NCLER', 'MON'], brand: 'Moncler' },

    // New Balance
    { patterns: ['NB', 'NEW BALANCE', 'N⭐W BAL⭐NCE', 'NEWBALANCE'], brand: 'New Balance' },

    // Essentials / Fear of God
    { patterns: ['ESSENTIALS', 'ESS', 'FOG', 'FEAR OF GOD', 'F⭐AR'], brand: 'Fear of God' },

    // Palm Angels
    { patterns: ['PALM ANGELS', 'PA', 'P⭐LM', 'PALMANGELS'], brand: 'Palm Angels' },

    // Trapstar
    { patterns: ['TRAPSTAR', 'TRAP', 'TR⭐PSTAR', 'TR⭐PS⭐AR'], brand: 'Trapstar' },

    // Stussy
    { patterns: ['STUSSY', 'STÜSSY', 'ST⭐SSY', 'STU'], brand: 'Stussy' },

    // Carhartt
    { patterns: ['CARHARTT', 'CARH', 'C⭐RHARTT'], brand: 'Carhartt' },

    // Represent
    { patterns: ['REPRESENT', 'REP', 'R⭐PRESENT'], brand: 'Represent' },

    // Gallery Dept
    { patterns: ['GALLERY DEPT', 'GALLERY', 'GALL⭐RY'], brand: 'Gallery Dept' },

    // Arc'teryx
    { patterns: ['ARCTERYX', "ARC'TERYX", 'ARC', 'ARCT⭐RYX'], brand: "Arc'teryx" },

    // Canada Goose
    { patterns: ['CANADA GOOSE', 'CG', 'C⭐NADA', 'GOOSE'], brand: 'Canada Goose' },

    // Oakley
    { patterns: ['OAKLEY', 'OAK', 'O⭐AKLEY'], brand: 'Oakley' },

    // Amiri
    { patterns: ['AMIRI', 'AM⭐RI', 'AMI'], brand: 'Amiri' },

    // Tommy Hilfiger
    { patterns: ['TOMMY', 'TOMMY HILFIGER', 'T⭐MMY', 'HILFIGER', 'T⭐⭐⭐H⭐⭐⭐R', 'T ⭐⭐ ⭐ H⭐⭐ ⭐R'], brand: 'Tommy Hilfiger' },

    // Lacoste
    { patterns: ['LACOSTE', 'LAC', 'L⭐COSTE'], brand: 'Lacoste' },

    // Hugo Boss
    { patterns: ['HUGO BOSS', 'BOSS', 'HB', 'H⭐GO'], brand: 'Hugo Boss' },

    // Puma
    { patterns: ['PUMA', 'P⭐MA', 'PUM'], brand: 'Puma' },

    // Fila
    { patterns: ['FILA', 'F⭐LA'], brand: 'Fila' },

    // Brunello Cucinelli
    { patterns: ['BRUNELLO CUCINELLI', 'BRU⭐⭐LLO CU⭐⭐NE⭐LI', 'BR⭐NELLO', 'CUCINELLI'], brand: 'Brunello Cucinelli' },

    // Timberland
    { patterns: ['TIMBERLAND', 'TI⭐⭐E⭐⭐AND', 'T⭐MBERLAND'], brand: 'Timberland' },

    // Givenchy
    { patterns: ['GIVENCHY', 'GI⭐️EN⭐️H⭐️', 'G⭐VENCHY'], brand: 'Givenchy' },

    // Chanel
    { patterns: ['CHANEL', 'CH⭐NELL', 'C⭐A⭐⭐L'], brand: 'Chanel' },

    // Cough Syrup
    { patterns: ['COU⭐H SY⭐UP'], brand: 'Cough Syrup' },

    // Aimé Leon Dore
    { patterns: ['AIMÉ LEON DORE', 'A⭐M⭐ L⭐ON D⭐R⭐', 'A⭐M⭐ LE⭐ON D⭐ORE'], brand: 'Aime Leon Dore' },

    // Under Armour
    { patterns: ['UN ⭐⭐R A ⭐⭐O ⭐⭐', 'UNDER ARMOUR', 'UN ⭐⭐R A ⭐⭐O ⭐⭐', 'UN ⭐⭐R A ⭐⭐O ⭐⭐', 'UND⭐R', 'UN ⭐⭐R A ⭐⭐O ⭐⭐'], brand: 'Under Armour' },

    // Champion
    { patterns: ['CHAMPION', 'CHAMP', 'CH⭐MPION'], brand: 'Champion' },

    // Burberry
    { patterns: ['B⭐R⭐E⭐RY'], brand: 'Champion' },

    // ALO
    { patterns: ['ALO', 'A⭐O'], brand: 'Alo' },

    // Levi's
    { patterns: ['LEVIS', "LEVI'S", 'LEV⭐S', 'LEVI', 'LE⭐IS'], brand: "Levi's" },

    // Calvin Klein
    { patterns: ['CALVIN KLEIN', 'CK', 'C⭐LVIN', 'KLEIN'], brand: 'Calvin Klein' },

    // Thom Browne
    { patterns: ['THOM BROWNE', 'TB', 'TH⭐M', 'BROWNE'], brand: 'Thom Browne' },

    // Kenzo
    { patterns: ['KENZO', 'K⭐NZO', 'KNZ'], brand: 'Kenzo' },

    // Fendi
    { patterns: ['FENDI', 'F⭐NDI', 'FEN'], brand: 'Fendi' },

    // New Era
    { patterns: ['NEW ERA', 'NE⭐W', 'N⭐W E⭐A'], brand: 'New Era' },

    // Arc'teryx
    { patterns: ['ARCTERYX', 'AR⭐T', 'A⭐⭐T⭐⭐YX'], brand: 'Arcteryx' },

    // Hermès
    { patterns: ['HERMES', 'HERMÈS', 'H⭐RMES'], brand: 'Hermès' },

    // Bottega Veneta
    { patterns: ['BOTTEGA', 'BOTTEGA VENETA', 'BV', 'B⭐TTEGA'], brand: 'Bottega Veneta' },

    // Loewe
    { patterns: ['LOEWE', 'L⭐EWE', 'L⭐E⭐⭐'], brand: 'Loewe' },

    // Celine
    { patterns: ['CELINE', 'CÉLINE', 'C⭐LINE', 'CEL'], brand: 'Celine' },

    // Alexander McQueen
    { patterns: ['MCQUEEN', 'ALEXANDER MCQUEEN', 'MCQ', 'ALX', 'AMQ'], brand: 'Alexander McQueen' },

    // Versace
    { patterns: ['VERSACE', 'V⭐RSACE', 'VER'], brand: 'Versace' },

    // Kith
    { patterns: ['KITH', 'K⭐TH'], brand: 'Kith' },

    // Bape
    { patterns: ['BAPE', 'A BATHING APE', 'B⭐PE', 'BATHING APE'], brand: 'Bape' },

    // Palace
    { patterns: ['PALACE', 'PAL⭐CE', 'P⭐⭐A⭐E'], brand: 'Palace' },

    // Umbro
    { patterns: ['UMBRO', 'U⭐MBRO', 'UM⭐RO'], brand: 'Umbro' },

    // Columbia
    { patterns: ['COLUMBIA', 'C⭐OLUMBIA', 'COL⭐MBIA', 'CO⭐⭐⭐⭐⭐A'], brand: 'Columbia' },

    // === NOVAS MARCAS ADICIONADAS ===

    // A
    { patterns: ['A🔥I', 'AMI'], brand: 'AMI' },
    { patterns: ['A🔥G', 'A.C.G.', 'ACG'], brand: 'A.C.G.' },
    { patterns: ['AMIRI', 'AM🔥RI'], brand: 'Amiri' },
    { patterns: ['ARITZIA'], brand: 'Aritzia' },
    { patterns: ['🔥DI🔥AS', 'ADIDAS'], brand: 'Adidas' },
    { patterns: ['ALO YOGA', 'ALO'], brand: 'Alo Yoga' },
    { patterns: ['ASKYURSELF', 'ASK YOURSELF'], brand: 'Askyurself' },
    { patterns: ['AIR J🔥RD🔥N', 'AIR JORDAN', 'JORDAN'], brand: 'Jordan' },
    { patterns: ['AND WANDER'], brand: 'And Wander' },
    { patterns: ['A🔥🔥T🔥🔥YX', 'ARCTERYX', "ARC'TERYX"], brand: "Arc'teryx" },
    { patterns: ['ACNE STUDIOS', 'ACNE'], brand: 'Acne Studios' },
    { patterns: ['AR🔥E AN🔥W🔥RP', 'ARNE ANTWERP'], brand: 'Arne Antwerp' },
    { patterns: ['ABERCROMBIE&FITCH', 'ABERCROMBIE', 'A&F'], brand: 'Abercrombie & Fitch' },
    { patterns: ['A🔥EX🔥🔥D🔥R W🔥NG', 'ALEXANDER WANG'], brand: 'Alexander Wang' },
    { patterns: ['ANTI SOCIAL SOCIAL CLUB', 'ASSC'], brand: 'Anti Social Social Club' },

    // B
    { patterns: ['B🔥A🔥S', 'BEAMS'], brand: 'Beams' },
    { patterns: ['BALMAIN', 'BAL🔥AIN'], brand: 'Balmain' },
    { patterns: ['B🔥RB🔥RRY', 'BURBERRY'], brand: 'Burberry' },
    { patterns: ['BORN✖RAISED', 'BORN RAISED'], brand: 'Born x Raised' },
    { patterns: ['BR🔥IN D🔥AD', 'BRAIN DEAD'], brand: 'Brain Dead' },
    { patterns: ['BROKEN PLANET'], brand: 'Broken Planet' },
    { patterns: ['B🔥L🔥🔥🔥IA🔥A', 'BALENCIAGA'], brand: 'Balenciaga' },
    { patterns: ['🔥RB🔥RRY'], brand: 'Burberry' },
    { patterns: ['BROOKS BROTHERS'], brand: 'Brooks Brothers' },
    { patterns: ['BIRTH OF ROYAL CHILD'], brand: 'Birth of Royal Child' },
    { patterns: ['B🔥TT🔥🔥A V🔥N🔥TA', 'BOTTEGA VENETA', 'BOTTEGA'], brand: 'Bottega Veneta' },
    { patterns: ['BR🔥N🔥L🔥O C🔥CI🔥🔥L🔥I', 'BRUNELLO CUCINELLI'], brand: 'Brunello Cucinelli' },

    // C
    { patterns: ['C.P.', 'C.P. COMPANY', 'CP COMPANY'], brand: 'C.P. Company' },
    { patterns: ['CDG', 'COMME DES GARCONS', 'COMME DES GARÇONS'], brand: 'Comme des Garçons' },
    { patterns: ['CONZ'], brand: 'Conz' },
    { patterns: ['CPFM', 'CACTUS PLANT FLEA MARKET'], brand: 'Cactus Plant Flea Market' },
    { patterns: ['C🔥LI🔥E', 'CELINE', 'CÉLINE'], brand: 'Celine' },
    { patterns: ['C🔥A🔥H', 'COACH'], brand: 'Coach' },
    { patterns: ['C🔥A🔥E🔥', 'CHANEL'], brand: 'Chanel' },
    { patterns: ['COCACOLA', 'COCA COLA', 'COCA-COLA'], brand: 'Coca Cola' },
    { patterns: ['C🔥RT🔥🔥Z', 'CORTEIZ', 'CRTZ'], brand: 'Corteiz' },
    { patterns: ['C🔥RH🔥RTT', 'CARHARTT'], brand: 'Carhartt' },
    { patterns: ['CHOOOSELF'], brand: 'Choooself' },
    { patterns: ['COLE BUXTON'], brand: 'Cole Buxton' },
    { patterns: ['C🔥S🔥BL🔥🔥C🔥', 'CASABLANCA'], brand: 'Casablanca' },
    { patterns: ['C🔥L🔥IN K🔥E🔥N', 'CALVIN KLEIN', 'CK'], brand: 'Calvin Klein' },
    { patterns: ['CH🔥OM🔥 HE🔥RTS', 'CH🔥OM🔥HE🔥RTS', '🔥OM🔥 HE🔥RTS', 'CHROME HEARTS'], brand: 'Chrome Hearts' },
    { patterns: ['C🔥N🔥🔥A G🔥🔥🔥E', 'CANADA GOOSE'], brand: 'Canada Goose' },

    // D
    { patterns: ['DGK'], brand: 'DGK' },
    { patterns: ['DREW', 'DREW HOUSE'], brand: 'Drew House' },
    { patterns: ['D🔥O🔥', 'DIOR'], brand: 'Dior' },
    { patterns: ['DICKIES'], brand: 'Dickies' },
    { patterns: ['D🔥E🔥E🔥', 'DIESEL'], brand: 'Diesel' },
    { patterns: ['DERSCHUTZE', 'DER SCHUTZE'], brand: 'Derschutze' },
    { patterns: ['DESCENDANT'], brand: 'Descendant' },
    { patterns: ['D🔥Q🔥🔥R🔥D2', 'DSQUARED2', 'DSQUARED'], brand: 'Dsquared2' },
    { patterns: ['D🔥N🔥MT 🔥🔥RS', 'DINOMITE EARS', 'DINAMT'], brand: 'Dinomite' },
    { patterns: ['D🔥LC🔥 GA🔥B🔥🔥A', 'DOLCE GABBANA', 'DOLCE & GABBANA', 'D&G'], brand: 'Dolce & Gabbana' },

    // E
    { patterns: ['ERL'], brand: 'ERL' },
    { patterns: ['EMIS'], brand: 'Emis' },
    { patterns: ['E.R.D', 'ERD'], brand: 'ERD' },
    { patterns: ['EVISU'], brand: 'Evisu' },
    { patterns: ['E🔥P🔥R🔥🔥 A🔥M🔥N🔥', 'EMPORIO ARMANI'], brand: 'Emporio Armani' },

    // F
    { patterns: ['FR2'], brand: 'FR2' },
    { patterns: ['FAR'], brand: 'Far' },
    { patterns: ['FOG', 'FEAR OF GOD', 'ESSENTIALS'], brand: 'Fear of God' },
    { patterns: ['FREITAG'], brand: 'Freitag' },
    { patterns: ['FASHION'], brand: 'Fashion' },
    { patterns: ['F🔥🔥D🔥', 'FENDI'], brand: 'Fendi' },
    { patterns: ['FRED PERRY'], brand: 'Fred Perry' },
    { patterns: ['FERRAGAMO', 'SALVATORE FERRAGAMO'], brand: 'Ferragamo' },

    // G
    { patterns: ['GAP'], brand: 'Gap' },
    { patterns: ['GANT'], brand: 'Gant' },
    { patterns: ['GANNI'], brand: 'Ganni' },
    { patterns: ['GRAILZ'], brand: 'Grailz' },
    { patterns: ['G🔥C🔥I', 'GUCCI'], brand: 'Gucci' },
    { patterns: ['GOLDWIN'], brand: 'Goldwin' },
    { patterns: ['GRAMICCI'], brand: 'Gramicci' },
    { patterns: ['GODSPEED'], brand: 'Godspeed' },
    { patterns: ['GYMSHARK'], brand: 'Gymshark' },
    { patterns: ['GI🔥EN🔥H🔥', 'GIVENCHY'], brand: 'Givenchy' },
    { patterns: ['GALLERY DEPT', 'GALLERY'], brand: 'Gallery Dept' },
    { patterns: ['GO🔥DBR🔥🔥D', 'GODBRAND'], brand: 'Godbrand' },
    { patterns: ['GOD SELECTION XXX'], brand: 'God Selection XXX' },

    // H
    { patterns: ['HUF'], brand: 'HUF' },
    { patterns: ['HELLSTAR'], brand: 'Hellstar' },
    { patterns: ['HOLLISTER'], brand: 'Hollister' },
    { patterns: ['H🔥R🔥E🔥', 'HERMES', 'HERMÈS'], brand: 'Hermès' },
    { patterns: ['HA🔥🔥🔥S', 'HANES'], brand: 'Hanes' },
    { patterns: ['H🔥G🔥 B🔥🔥S', 'H🔥G🔥B🔥🔥S', 'HUGO BOSS', 'BOSS'], brand: 'Hugo Boss' },
    { patterns: ['HELLY HANSEN'], brand: 'Helly Hansen' },
    { patterns: ['H🔥M🔥N MA🔥E', 'HUMAN MADE'], brand: 'Human Made' },
    { patterns: ['HOUSE OF ERRORS'], brand: 'House of Errors' },

    // I
    { patterns: ['ICECREAM', 'ICE CREAM'], brand: 'Icecream' },
    { patterns: ['IH NOM UH NIT'], brand: 'Ih Nom Uh Nit' },

    // J
    { patterns: ['JANSPORT'], brand: 'Jansport' },
    { patterns: ['JIL SANDER'], brand: 'Jil Sander' },
    { patterns: ['JO🔥H🔥A J🔥M🔥L', 'JOSHUA JAMAL'], brand: 'Joshua Jamal' },

    // K
    { patterns: ['KITON'], brand: 'Kiton' },
    { patterns: ['KSUBI'], brand: 'Ksubi' },
    { patterns: ['K🔥T🔥', 'KITH'], brand: 'Kith' },
    { patterns: ['KANGOL'], brand: 'Kangol' },
    { patterns: ['K🔥N🔥O', 'KENZO'], brand: 'Kenzo' },
    { patterns: ['KENT CURWEN'], brand: 'Kent Curwen' },
    { patterns: ['KLATTERMUSEN'], brand: 'Klattermusen' },
    { patterns: ['KARL LAGERFELD'], brand: 'Karl Lagerfeld' },

    // L
    { patterns: ['L🔥', 'LV', '1V', 'LOUIS VUITTON'], brand: 'Louis Vuitton' },
    { patterns: ['LEE'], brand: 'Lee' },
    { patterns: ['LE🔥IS', "LEVI'S", 'LEVIS'], brand: "Levi's" },
    { patterns: ['L🔥E🔥🔥', 'LOEWE'], brand: 'Loewe' },
    { patterns: ['L🔥C🔥ST🔥', 'LACOSTE'], brand: 'Lacoste' },
    { patterns: ['LOSTSHDWS', 'LOST SHADOWS'], brand: 'Lost Shadows' },
    { patterns: ['L🔥🔥UL🔥M🔥N', 'LULULEMON'], brand: 'Lululemon' },
    { patterns: ['L🔥🔥O P🔥A🔥A', 'LORO PIANA'], brand: 'Loro Piana' },

    // M
    { patterns: ['MLB'], brand: 'MLB' },
    { patterns: ['MARNI'], brand: 'Marni' },
    { patterns: ['M🔥RT🔥A', 'MARTIA'], brand: 'Martia' },
    { patterns: ['MOWALOLA'], brand: 'Mowalola' },
    { patterns: ['M🔥MM🔥T', 'MAMMUT'], brand: 'Mammut' },
    { patterns: ['M🔥U M🔥U', 'MIU MIU'], brand: 'Miu Miu' },
    { patterns: ['MASTERMIND'], brand: 'Mastermind' },
    { patterns: ['M🔥🔥🔥🔥🔥R', 'MONCLER'], brand: 'Moncler' },
    { patterns: ['M🔥🔥T-B🔥🔥L', 'MONT BELL', 'MONTBELL'], brand: 'Montbell' },
    { patterns: ['MASSIMO DUTTI'], brand: 'Massimo Dutti' },
    { patterns: ['MARDI MERCREDI'], brand: 'Mardi Mercredi' },
    { patterns: ['MARCELO BURLON'], brand: 'Marcelo Burlon' },
    { patterns: ['MA🔥TI🔥E R🔥🔥E', 'MARTINE ROSE'], brand: 'Martine Rose' },
    { patterns: ['M🔥🔥ED E🔥🔥TI🔥N', 'MISSED EDITION'], brand: 'Missed Edition' },
    { patterns: ['M🔥🔥SE K🔥🔥CK🔥🔥S', 'MOOSE KNUCKLES'], brand: 'Moose Knuckles' },
    { patterns: ['M🔥IS🔥N M🔥R🔥IE🔥A', 'MAISON MARGIELA'], brand: 'Maison Margiela' },
    { patterns: ['M🔥🔥S🔥N K🔥🔥S🔥N🔥', 'MAISON KITSUNE', 'MAISON KITSUNÉ'], brand: 'Maison Kitsuné' },

    // N
    { patterns: ['N🔥K🔥', 'NIKE'], brand: 'Nike' },
    { patterns: ['NANGA'], brand: 'Nanga' },
    { patterns: ['NAUTICA'], brand: 'Nautica' },
    { patterns: ['N🔥C🔥A', 'NOCTA'], brand: 'Nocta' },
    { patterns: ['NEEDLES'], brand: 'Needles' },
    { patterns: ['NEW ERA'], brand: 'New Era' },
    { patterns: ['NONNOD'], brand: 'Nonnod' },
    { patterns: ['NANAMICA'], brand: 'Nanamica' },
    { patterns: ['NEIGHBORHOOD', 'NBHD'], brand: 'Neighborhood' },

    // O
    { patterns: ['OA🔥L🔥Y', 'OAKLEY'], brand: 'Oakley' },
    { patterns: ['OUR LEGACY'], brand: 'Our Legacy' },
    { patterns: ['ON RU🔥🔥I🔥G', 'ON RUNNING', 'ON'], brand: 'On Running' },
    { patterns: ['O🔥🔥-W🔥🔥TE', 'OFF-WHITE', 'OFF WHITE'], brand: 'Off-White' },

    // P
    { patterns: ['PIET'], brand: 'Piet' },
    { patterns: ['POLO', 'POLO RALPH LAUREN'], brand: 'Ralph Lauren' },
    { patterns: ['PATTA'], brand: 'Patta' },
    { patterns: ['PHENIX'], brand: 'Phenix' },
    { patterns: ['P🔥🔥A', 'PUMA'], brand: 'Puma' },
    { patterns: ['P🔥A🔥A', 'PRADA'], brand: 'Prada' },
    { patterns: ['P🔥LA🔥E', 'PALACE'], brand: 'Palace' },
    { patterns: ['PLAY BOY', 'PLAYBOY'], brand: 'Playboy' },
    { patterns: ['PLEASURES'], brand: 'Pleasures' },
    { patterns: ['PROJECT G/R'], brand: 'Project G/R' },
    { patterns: ['PAUL&SHARK', 'PAUL & SHARK'], brand: 'Paul & Shark' },
    { patterns: ['PURPLE BRAND'], brand: 'Purple Brand' },
    { patterns: ['P🔥TAG🔥N🔥A', 'PATAGONIA'], brand: 'Patagonia' },
    { patterns: ['P🔥🔥M A🔥G🔥🔥S', 'PALM ANGELS'], brand: 'Palm Angels' },

    // R
    { patterns: ['ROA'], brand: 'ROA' },
    { patterns: ['RRR123'], brand: 'RRR123' },
    { patterns: ['RADIALL'], brand: 'Radiall' },
    { patterns: ['R🔥U🔥E', 'RHUDE'], brand: 'Rhude' },
    { patterns: ['REPRESENT', 'REP'], brand: 'Represent' },
    { patterns: ['RICK OWENS'], brand: 'Rick Owens' },
    { patterns: ['READYMADE', 'READY MADE'], brand: 'Readymade' },
    { patterns: ['ROUGH PLAY'], brand: 'Rough Play' },
    { patterns: ['RON HERMAN'], brand: 'Ron Herman' },
    { patterns: ['RA🔥PH🔥AU🔥EN', 'RALPH LAUREN'], brand: 'Ralph Lauren' },

    // S
    { patterns: ['SYNA', 'SYNAWORLD'], brand: 'Syna' },
    { patterns: ['STUSSY', 'STÜSSY'], brand: 'Stussy' },
    { patterns: ['S/DOUBLE'], brand: 'S/Double' },
    { patterns: ['S🔥C🔥I', 'SACAI'], brand: 'Sacai' },
    { patterns: ['S🔥5D🔥R', 'S5DR'], brand: 'S5DR' },
    { patterns: ['S🔥P🔥E🔥E', 'SUPREME'], brand: 'Supreme' },
    { patterns: ['SNOW PEAK'], brand: 'Snow Peak' },
    { patterns: ['SAINT TEARS'], brand: 'Saint Tears' },
    { patterns: ['SAINT MICHAEL'], brand: 'Saint Michael' },
    { patterns: ['S🔥O🔥E ISL🔥🔥D', 'STONE ISLAND'], brand: 'Stone Island' },
    { patterns: ['SA🔥🔥T LA🔥🔥E🔥🔥', 'SAINT LAURENT', 'YSL'], brand: 'Saint Laurent' },

    // T
    { patterns: ['TUMI'], brand: 'Tumi' },
    { patterns: ['THE ROW'], brand: 'The Row' },
    { patterns: ['TRAPSTAR', 'TRAP'], brand: 'Trapstar' },
    { patterns: ['THRASHER'], brand: 'Thrasher' },
    { patterns: ['TOM FORD'], brand: 'Tom Ford' },
    { patterns: ['TOPOLOGIE'], brand: 'Topologie' },
    { patterns: ['THUG CLUB'], brand: 'Thug Club' },
    { patterns: ['TRAVIS SCOTT', 'CACTUS JACK'], brand: 'Travis Scott' },
    { patterns: ['TH🔥M B🔥🔥WE', 'THOM BROWNE'], brand: 'Thom Browne' },
    { patterns: ['T🔥🔥 N🔥🔥F🔥🔥', 'THE NORTH FACE', 'TNF'], brand: 'The North Face' },
    { patterns: ['T 🔥🔥🔥 H🔥🔥🔥R', 'TOMMY HILFIGER', 'TOMMY', 'T🔥🔥🔥 H🔥🔥🔥R', 'T🔥🔥🔥H🔥🔥🔥R'], brand: 'Tommy Hilfiger' },
    { patterns: ['T🔥M🔥🔥🔥L🔥🔥D', 'TIMBERLAND'], brand: 'Timberland' },
    { patterns: ["TH🔥T'S A AW🔥UL L🔥T OF C..", "THAT'S AWFUL"], brand: "That's Awful" },

    // U
    { patterns: ['UNION'], brand: 'Union' },
    { patterns: ['UNIQUE'], brand: 'Unique' },
    { patterns: ['UNKNOWN'], brand: 'Unknown' },
    { patterns: ['UNDEFEATED', 'UNDFTD'], brand: 'Undefeated' },
    { patterns: ['UNDERMYCAR'], brand: 'Undermycar' },
    { patterns: ['U🔥D🔥R A🔥MO🔥R', 'UNDER ARMOUR', 'UA'], brand: 'Under Armour' },

    // V
    { patterns: ['VLONE'], brand: 'Vlone' },
    { patterns: ['VINTAGE'], brand: 'Vintage' },
    { patterns: ['VA🔥L🔥Y', 'VALARAY'], brand: 'Valaray' },
    { patterns: ['VALENTINO'], brand: 'Valentino' },
    { patterns: ['VETEMENTS'], brand: 'Vetements' },
    { patterns: ['VE🔥SA🔥E', 'VERSACE'], brand: 'Versace' },
    { patterns: ['VIVIENNE WESTWOOD'], brand: 'Vivienne Westwood' },

    // W
    { patterns: ['WTAPS'], brand: 'WTAPS' },
    { patterns: ['WE11DONE', 'WELLDONE'], brand: 'We11done' },
    { patterns: ['WILD THINGS'], brand: 'Wild Things' },
    { patterns: ['WHO DECIDES WAR', 'WDW'], brand: 'Who Decides War' },

    // X
    { patterns: ['X-BIONIC', 'XBIONIC'], brand: 'X-Bionic' },

    // Y
    { patterns: ['Y🔥', 'Y3', 'Y-3'], brand: 'Y-3' },
    { patterns: ['Y🔥🔥ZY', 'YEEZY'], brand: 'Yeezy' },
    { patterns: ['Y/PROJECT', 'Y PROJECT'], brand: 'Y/Project' },
    { patterns: ['YAMATOMICHI'], brand: 'Yamatomichi' },

    // Z
    { patterns: ['Z🔥🔥G🔥A', 'ZEGNA', 'ERMENEGILDO ZEGNA'], brand: 'Zegna' },

    // Números
    { patterns: ['6PM'], brand: '6PM' },
];


// ============================================
// MAPEAMENTO DE MODELOS DE TÊNIS
// ============================================
const SHOE_MODEL_PATTERNS = [
    // Nike Air Force
    { patterns: ['AIR FORCE 1', 'AIR FORCE', 'AF1', 'AF-1'], model: 'Air Force 1', brand: 'Nike' },

    // B27
    { patterns: ['B27'], model: 'B27', brand: 'Dior' },

    // Air Jordan
    { patterns: ['AIR JORDAN 1', 'AJ1', 'JORDAN 1'], model: 'Air Jordan 1', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 3', 'AJ3', 'JORDAN 3'], model: 'Air Jordan 3', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 4', 'AJ4', 'JORDAN 4'], model: 'Air Jordan 4', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 5', 'AJ5', 'JORDAN 5'], model: 'Air Jordan 5', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 6', 'AJ6', 'JORDAN 6'], model: 'Air Jordan 6', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 8', 'AJ8', 'JORDAN 8'], model: 'Air Jordan 8', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 10', 'AJ10', 'JORDAN 10'], model: 'Air Jordan 10', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 11', 'AJ11', 'JORDAN 11'], model: 'Air Jordan 11', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 12', 'AJ12', 'JORDAN 12'], model: 'Air Jordan 12', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 34', 'AJ34', 'JORDAN 34'], model: 'Air Jordan 34', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 35', 'AJ35', 'JORDAN 35'], model: 'Air Jordan 35', brand: 'Jordan' },
    { patterns: ['AIR JORDAN 36', 'AJ36', 'JORDAN 36'], model: 'Air Jordan 36', brand: 'Jordan' },
    { patterns: ['TS JUMPMAN JACK', 'JUMPMAN JACK'], model: 'TS Jumpman Jack', brand: 'Jordan' },
    { patterns: ['TRAVIS SCOTT X JORDAN', 'TRAVIS JORDAN'], model: 'Travis Scott x Jordan', brand: 'Jordan' },

    // Nike Air Max
    { patterns: ['AIR MAX TN', 'TN PLUS', 'AIR MAX PLUS'], model: 'Air Max TN Plus', brand: 'Nike' },
    { patterns: ['AIR MAX 90'], model: 'Air Max 90', brand: 'Nike' },
    { patterns: ['AIR MAX 95'], model: 'Air Max 95', brand: 'Nike' },
    { patterns: ['AIR MAX 97'], model: 'Air Max 97', brand: 'Nike' },
    { patterns: ['AIR MAX DN'], model: 'Air Max DN', brand: 'Nike' },

    // Nike Dunk
    { patterns: ['DUNK', 'SB DUNK', 'DUNK LOW', 'DUNK HIGH'], model: 'Dunk', brand: 'Nike' },

    // Nike Shox
    { patterns: ['SHOX MR4', 'NIKE SHOX MR4'], model: 'Nike Shox MR4', brand: 'Nike' },
    { patterns: ['SHOX RIDE 2', 'NIKE SHOX RIDE'], model: 'Nike Shox Ride 2', brand: 'Nike' },
    { patterns: ['SHOX TLX', 'NIKE SHOX TLX'], model: 'Nike Shox TLX', brand: 'Nike' },

    // Nike Kobe
    { patterns: ['KOBE 4'], model: 'Kobe 4', brand: 'Nike' },
    { patterns: ['KOBE 5'], model: 'Kobe 5', brand: 'Nike' },
    { patterns: ['KOBE 6'], model: 'Kobe 6', brand: 'Nike' },
    { patterns: ['KOBE 8'], model: 'Kobe 8', brand: 'Nike' },
    { patterns: ['KOBE 9'], model: 'Kobe 9', brand: 'Nike' },

    // Outras Nike
    { patterns: ['NOCTA X NIKE', 'NOCTA X NK', 'NOCTA'], model: 'NOCTA x Nike', brand: 'Nike' },
    { patterns: ['SABRINA 2', 'NIKE SABRINA'], model: 'Nike Sabrina 2.0', brand: 'Nike' },
    { patterns: ['SACAI 3.0', 'SACAI'], model: 'Sacai 3.0', brand: 'Nike' },
    { patterns: ['P-6000', 'P6000', 'INITIATOR'], model: 'Nike P-6000', brand: 'Nike' },
    { patterns: ['G.T CUT', 'GT CUT'], model: 'G.T Cut', brand: 'Nike' },
    { patterns: ['NIKE ZOOM'], model: 'Nike Zoom', brand: 'Nike' },
    { patterns: ['NIKE CPFM', 'CPFM'], model: 'Nike CPFM', brand: 'Nike' },
    { patterns: ['NIKEXRTFKT', 'RTFKT'], model: 'Nike x RTFKT', brand: 'Nike' },
    { patterns: ['JA 3', 'NIKE JA'], model: 'Nike Ja 3', brand: 'Nike' },
    { patterns: ['KYRIE 5', 'KYRIE 6', 'KYRIE 7', 'KYRIE 8', 'MAX BATCH KYRIE'], model: 'Kyrie', brand: 'Nike' },
    { patterns: ['TRAVIS SCOTT X NIKE', 'SHARK-A-DON'], model: 'Travis Scott x Nike', brand: 'Nike' },
    { patterns: ['STUSSY X NK', 'ROSHE RUN', 'LD-1000'], model: 'Stussy x Nike', brand: 'Nike' },
    { patterns: ['AMBASSADOR13', 'AMBASSADOR 13'], model: 'Ambassador 13', brand: 'Nike' },

    // Yeezy
    { patterns: ['YEEZY 350', 'YEEZY BOOST 350'], model: 'Yeezy Boost 350', brand: 'Yeezy' },
    { patterns: ['YEEZY 500'], model: 'Yeezy 500', brand: 'Yeezy' },
    { patterns: ['YEEZY 700'], model: 'Yeezy 700', brand: 'Yeezy' },
    { patterns: ['YEEZY SLIDE'], model: 'Yeezy Slide', brand: 'Yeezy' },
    { patterns: ['YEEZY FOAM', 'FOAM RUNNER'], model: 'Yeezy Foam Runner', brand: 'Yeezy' },

    // Adidas
    { patterns: ['AD CAMPUS', 'ADIDAS CAMPUS', 'CAMPUS'], model: 'Adidas Campus', brand: 'Adidas' },
    { patterns: ['AD SAMBA', 'ADIDAS SAMBA', 'SAMBAS'], model: 'Adidas Samba', brand: 'Adidas' },
    { patterns: ['SUPERSTAR', 'AD SUPERSTAR'], model: 'Adidas Superstar', brand: 'Adidas' },
    { patterns: ['ULTRA BOOST', 'ULTRABOOST', 'UB UTRL'], model: 'Adidas Ultra Boost', brand: 'Adidas' },
    { patterns: ['ADIZERO'], model: 'Adidas Adizero', brand: 'Adidas' },
    { patterns: ['ADI2000', 'ADIDAS ORIGINALS'], model: 'Adidas Originals', brand: 'Adidas' },
    { patterns: ['BAD BUNNY', 'AD X BAD BUNNY'], model: 'Adidas x Bad Bunny', brand: 'Adidas' },
    { patterns: ['PHARRELL', 'ADISTAR JELLYFISH'], model: 'Pharrell x Adidas', brand: 'Adidas' },
    { patterns: ['ADILETTE 22'], model: 'Adilette 22', brand: 'Adidas' },
    { patterns: ['ADIZERO ARUKU'], model: 'Adidas Adizero Aruku', brand: 'Adidas' },

    // New Balance
    { patterns: ['NEW BALANCE 327', 'NB 327', 'NB327'], model: 'New Balance 327', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 530', 'NB 530', 'NB530'], model: 'New Balance 530', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 550', 'NB 550', 'NB550'], model: 'New Balance 550', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 990', 'NB 990', '990V3', '990V6'], model: 'New Balance 990', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 991', 'NB 991', '991V2'], model: 'New Balance 991', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 992', 'NB 992'], model: 'New Balance 992', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 993', 'NB 993'], model: 'New Balance 993', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 1000', 'NB 1000'], model: 'New Balance 1000', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 1906', 'NB 1906'], model: 'New Balance 1906', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 2000', 'NB 2000'], model: 'New Balance 2000', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 2002', 'NB 2002'], model: 'New Balance 2002', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 9060', 'NB 9060'], model: 'New Balance 9060', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 471', 'NB 471'], model: 'New Balance 471', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 740', 'NB 740'], model: 'New Balance 740', brand: 'New Balance' },
    { patterns: ['NEW BALANCE 204', 'NB 204'], model: 'New Balance 204', brand: 'New Balance' },
    { patterns: ['FUELCELL REBEL'], model: 'New Balance FuelCell Rebel', brand: 'New Balance' },

    // Outras marcas
    { patterns: ['LV TRAINER'], model: 'LV Trainer', brand: 'Louis Vuitton' },
    { patterns: ['LANVIN'], model: 'Lanvin', brand: 'Lanvin' },
    { patterns: ['CONVERSE'], model: 'Converse', brand: 'Converse' },
    { patterns: ['SALOMON'], model: 'Salomon', brand: 'Salomon' },
    { patterns: ['TIMBERLAND'], model: 'Timberland', brand: 'Timberland' },
    { patterns: ['CROCS'], model: 'Crocs', brand: 'Crocs' },
    { patterns: ['ASICS'], model: 'Asics', brand: 'Asics' },
    { patterns: ['PUMA'], model: 'Puma', brand: 'Puma' },
    { patterns: ['VANS'], model: 'Vans', brand: 'Vans' },
    { patterns: ['SAUCONY'], model: 'Saucony', brand: 'Saucony' },
    { patterns: ['ONITSUKA TIGER', 'ONITSUKA'], model: 'Onitsuka Tiger', brand: 'Onitsuka Tiger' },
    { patterns: ['BAPE STA', 'BAPESTA'], model: 'Bape STA', brand: 'Bape' },
    { patterns: ['RICK OWENS'], model: 'Rick Owens', brand: 'Rick Owens' },
    { patterns: ['MCQUEEN', 'ALEXANDER MCQUEEN'], model: 'McQueen', brand: 'Alexander McQueen' },
    { patterns: ['RAF SIMONS', 'CYLON-21'], model: 'RAF Simons Cylon-21', brand: 'RAF Simons' },
    { patterns: ['GGDB', 'GOLDEN GOOSE'], model: 'Golden Goose', brand: 'Golden Goose' },
    { patterns: ['BOTTEGA VENETA'], model: 'Bottega Veneta', brand: 'Bottega Veneta' },
    { patterns: ['MIUMIU', 'MIU MIU'], model: 'Miu Miu', brand: 'Miu Miu' },
    { patterns: ['OFF WHITE', 'OFF-WHITE'], model: 'Off-White', brand: 'Off-White' },
    { patterns: ['AMIRI'], model: 'Amiri', brand: 'Amiri' },
    { patterns: ['BIRKENSTOCK'], model: 'Birkenstock', brand: 'Birkenstock' },
    { patterns: ['BALENCIAGA'], model: 'Balenciaga', brand: 'Balenciaga' },
    { patterns: ['RUDIS'], model: 'RUDIS', brand: 'RUDIS' },
    { patterns: ['ON CLOUD', '昂跑'], model: 'ON Cloud', brand: 'On Running' },
    { patterns: ['ALTRA', '奥创'], model: 'Altra', brand: 'Altra' },
    { patterns: ['MIZUNO', '美津浓'], model: 'Mizuno', brand: 'Mizuno' },
    { patterns: ['ALO YOGA', 'ALO'], model: 'Alo Yoga', brand: 'Alo' },
    { patterns: ['ARCTERYX'], model: 'Arcteryx', brand: "Arc'teryx" },
    { patterns: ['DIO*R', 'DIOR'], model: 'Dior', brand: 'Dior' },
    { patterns: ['PRADA'], model: 'Prada', brand: 'Prada' },

    // Categorias especiais (não são modelos específicos)
    { patterns: ['SLIPPERS', 'SLIPPER'], model: 'Chinelos', brand: null },
    { patterns: ['SOCCER SHOES', 'SOCCER'], model: 'Chuteiras', brand: null },
    { patterns: ["CHILDREN'S SHOES", 'CHILDREN SHOES', 'KIDS SHOES'], model: 'Calçados Infantis', brand: null },
    { patterns: ['CLOTHES SALE'], model: 'Roupas em Promoção', brand: null },
    { patterns: ['GOAT FACTORY'], model: 'GOAT Factory', brand: null },
    { patterns: ['JMDY-SALE', 'JMDY-TAOBAO'], model: 'JMDY Promoção', brand: null },
    { patterns: ['REAL VS FAKE'], model: 'Real vs Fake', brand: null },
    { patterns: ['EXCLUSIVE SPECIAL', 'B PRODUCTS'], model: 'Produtos Especiais', brand: null },
    { patterns: ['AMERICAN WAREHOUSE'], model: 'Estoque Americano', brand: null },
];

// Vendedores especializados em tênis (todos produtos são calçados)
const SHOE_VENDORS = [
    'tianjin-no1.x.yupoo.com',
    'jmdy.x.yupoo.com',
    '4urun-1.x.yupoo.com'
];

// ============================================
// MAPEAMENTO DE BATCHES (Fábricas de Tênis)
// Batches são identificadas dentro de 【】
// A correspondência deve ser EXATA (não parcial)
// ============================================
const BATCH_PATTERNS = [
    'G',
    'GX SDS',
    'S2',
    'HY',
    'TOP',
    'OWF',
    'XP',
    '3A',
    'GX',
    '89',
    'PK',
    'LW]',
    'MAX',
    'MOK',
    'TG',
    'G5',
    'M',
    'NEW VT',
    'VT',
    'OG',
    'CS',
    'BC',
    'Z',
    'AS',
    'AY',
    'LT',
    'LJR',
    'ZC',
    'PE',
    'DF',
    'T1',
    'I8',
    'WX',
    'XE',
    'YH',
    '奥莱',
    'GOAT',
    'HL',
    'C',
    'GC',
    '新G5',
    'STAR',
    'FF',
    'FK',
    'DG',
    'ZD',
    'DU',
    'KZ2.0',
    'S',
    'OX',
    'RS',
    'GT',
    'NO.1',
    'PB/MAX',
    'KZ',
    'GK',
    'GZ',
    'GK',
    'EM',
    'DT',
    'ON.1',
    'ZG',
    'Y3',
    'GD',
    'NEW KZ',
    'DGC',
    'A+',
    'PK4.0',
    'AM',
    'WM',
    'SK',
    'DT 升级',
    'TX',
    'Y',
    'XA',
    'HS',
    'XC',
    'FC',
    'XA',
    'X',
    'Best',
    'TK',
    'YC SALE',
    'CY SALE',
    'LJ SALE',
    'OG SALE',
    'DG SALE',
    'DG 2.0',
    'DG2.0',
    'EG',
    'PK 4.0',
    'BS',
    'Z版',
    'OK',
    'LW',
    'TG Batch',
    'TG',
    'Y3版',
    'ST',
    '5A',
    'KX',
    'RN',
    'MX',
    'KZ',
    'OG',
    'DU'
];

// ============================================
// PALAVRAS-CHAVE DE CATEGORIAS
// ============================================
const CATEGORY_KEYWORDS = {
    'Calças': [
        'PANTS', 'PANT', 'JEANS', 'JEAN', 'TROUSERS', 'TROUSER', 'JOGGER', 'JOGGERS',
        'CARGO', 'CHINO', 'CHINOS', 'LEGGING', 'LEGGINGS',
        '裤', '裤子', '长裤', '短裤', 'SWEATPANTS', 'TRACKPANTS', 'TRACK PANTS'
    ],
    'Shorts': [
        'SHORTS', 'SHORT'
    ],
    'Calçados': [
        'SHOE', 'SHOES', 'SNEAKER', 'SNEAKERS', 'BOOT', 'BOOTS', 'RUNNER', 'RUNNERS',
        'FOOTWEAR', 'LOAFER', 'LOAFERS', 'SANDAL', 'SANDALS', 'SLIPPER', 'SLIPPERS',
        'SLIDE', 'SLIDES', 'TRAINER', 'TRAINERS', 'KICKS', 'FOAM',
        '鞋', '运动鞋', '靴', 'HOT STEP', 'DUNK', 'AIR FORCE', 'AF1', 'AJ1', 'AJ4', 'RETRO'
    ],
    'Camisetas': [
        'T-SHIRT', 'T-SHIT', 'T-SHIR', 'TSHIRT', 'TEE', 'TEES', 'SHIRT', 'SHIRTS', 'TOP',
        'T恤', '衬衫', 'TANK TOP', 'TANKTOP', 'JERSEY', 'POLO'
    ],
    'Moletons': [
        'HOODIE', 'HOODIES', 'SWEATSHIRT', 'SWEAT SHIRT', 'CREWNECK', 'CREW NECK',
        'SWEATER', 'PULLOVER', 'FLEECE', 'LONG SLEEVED', 'SLEEVDE', 'LONG-SLEEVED', 'LONG SLEEVE', 'LONG-SLEEE',
        '卫衣', '套头', 'HOODED', 'HOOD', 'SUNSCREEN CLOTHING'
    ],
    'Algodão': [
        'COTTON CIOTHES', 'COTTON'
    ],
    'Meias': [
        'SOCK', 'SOCKS'
    ],
    'Mochilas': [
        'BAG', 'BAGS', 'BACKPACK', 'BACKPACKS', 'SCHOOL BAG', 'SCHOOL BAGS', 'HANDBAG', 'HANDBAGS', 'CLUTCH', 'CLUTCHES', 'TOTE', 'TOTES', 'SUITCASE', 'SUITCASES', 'LUGGAGE', 'LUGGAGES', 'BAGGAGE', 'BAGGAGES'
    ],
    'Saias': [
        'SKIRT', 'SKIRTS', 'LONG SKIRT'
    ],
    'Casacos': [
        'JACKET', 'JACKETS', 'COAT', 'COATS', 'BOMBER', 'PARKA', 'WINDBREAKER',
        'VARSITY', 'PUFFER', 'DOWN', 'PADDED', 'QUILTED', 'DENIM JACKET',
        '夹克', '外套', '羽绒', 'OVERCOAT', 'BLAZER', 'VEST'
    ],
    'Coletes e Regatas': [
        'VEST', 'VESTS', 'REGATA', 'REGATAS', 'TANK TOP', 'TANKTOP'
    ],
    'Acessórios de Cabeça': [
        'HAT', 'HATS', 'CAP', 'CAPS', 'SNAPBACK', 'BASEBALL CAP', 'DAD HAT', 'FITTED CAP',
        'TRUCKER', '帽子', '棒球帽', '鸭舌帽', 'VISOR', 'HEADGEAR'
    ],
    'Óculos': [
        'SUNGLASSES', 'GLASSES'
    ],
    'Lenços': [
        'SCART', 'SCARTS', 'SCARF', 'SCARFS'
    ],
    'Luvas': [
        'GLOVE', 'GLOVES'
    ],
    'Roupas de Baixo': [
        'UNDERWEAR', 'UNDERWEARE'
    ],
    'Chapéus': [
        'BUCKET', 'BUCKET HAT', 'FEDORA', 'BOATER',
        '渔夫帽', '帽', 'SUNHAT', 'STRAW HAT'
    ],
    'Toucas': [
        'BEANIE', 'BEANIES', 'KNIT HAT', 'WINTER HAT', 'SKULLCAP',
        '毛线帽', '针织帽', 'WOOLEN CAP', 'KNITTED'
    ]
};

// ============================================
// FUNÇÕES DE EXTRAÇÃO
// ============================================

/**
 * Extrai o preço do título
 * Formatos suportados: 460Y, ￥135, 135￥, 【220Y】, ¥135, ￥~349
 * Regra: o PRIMEIRO símbolo de moeda encontrado no título define o preço.
 * Y sozinho só é reconhecido no formato NúmeroY (ex: 220Y, 460Y).
 */
function extractPrice(title) {
    const patterns = [
        // ￥/¥ seguido de número: ￥135, ¥460, 【￥460】 (inequívoco)
        /【?[￥¥]\s*(\d+(?:\.\d+)?)】?/gi,

        // Número seguido de ￥/¥: 460￥, 135¥ (inequívoco)
        /(?:^|[^:])【?(\d+(?:\.\d+)?)\s*[￥¥]】?/gi,

        // ￥/¥ com til: ￥~66, ￥～349 (inequívoco)
        /[￥¥][~～]\s*(\d+(?:\.\d+)?)/gi,

        // NúmeroY: 220Y, 460Y, 【220Y】 — Y NÃO seguido de letra/dígito
        // Evita matches parciais em códigos como GY9693
        /(?:^|[^:])【?(\d+(?:\.\d+)?)\s*Y(?![a-zA-Z\d])】?/gi,

        // Y com til: Y~66, Y～349 — Y NÃO precedido de letra
        /(?:^|[^a-zA-Z])Y[~～]\s*(\d+(?:\.\d+)?)/gi,

        // yuan textual: 135 yuan
        /(\d+(?:\.\d+)?)\s*yuan/gi,
    ];

    // Encontra o match mais cedo (primeiro símbolo de moeda no título = preço real)
    let earliest = null;

    for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(title);
        if (match) {
            if (earliest === null || match.index < earliest.position) {
                earliest = { position: match.index, value: parseFloat(match[1]) };
            }
        }
    }

    return earliest ? earliest.value : null;
}

/**
 * Extrai a marca do título
 */
function extractBrand(title) {
    const upperTitle = title.toUpperCase();

    for (const { patterns, brand } of BRAND_PATTERNS) {
        for (const pattern of patterns) {
            // Verifica se o padrão está presente no título
            if (upperTitle.includes(pattern.toUpperCase())) {
                return brand;
            }
        }
    }

    return null;
}

/**
 * Extrai a batch (fábrica) do título
 * Batches são identificadas dentro de 【】
 * A correspondência deve ser EXATA (não parcial)
 * Ex: 【G 】 -> "G", 【LJR】 -> "LJR", 【TOP GEAR】 -> null (não é batch válida)
 */
function extractBatch(title) {
    // Regex para capturar conteúdo dentro de 【】
    const bracketRegex = /【([^】]+)】/g;
    let match;

    while ((match = bracketRegex.exec(title)) !== null) {
        const content = match[1].trim().toUpperCase();

        // Verifica correspondência EXATA com uma batch conhecida
        for (const batch of BATCH_PATTERNS) {
            if (content === batch.toUpperCase()) {
                return batch;
            }
        }
    }

    return null;
}

/**
 * Detecta a categoria do produto
 */
function detectCategory(title, vendorUrl = null) {
    const upperTitle = title.toUpperCase();

    // Se for vendedor de tênis, categoria é automaticamente Calçados
    if (vendorUrl) {
        for (const shoeVendor of SHOE_VENDORS) {
            if (vendorUrl.includes(shoeVendor)) {
                return 'Calçados';
            }
        }
    }

    // Primeiro, verifica categorias específicas
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (upperTitle.includes(keyword.toUpperCase())) {
                return category;
            }
        }
    }

    return 'Desconhecido';
}

/**
 * Extrai o modelo de tênis do título
 */
function extractShoeModel(title) {
    const upperTitle = title.toUpperCase();

    for (const { patterns, model, brand } of SHOE_MODEL_PATTERNS) {
        for (const pattern of patterns) {
            if (upperTitle.includes(pattern.toUpperCase())) {
                return { model, brand };
            }
        }
    }

    return null;
}

/**
 * Filtra um único produto
 */
function filterProduct(product, vendorUrl = null) {
    const title = product.title || '';

    let marca = extractBrand(title);
    const categoria = detectCategory(title, vendorUrl);
    const modeloInfo = extractShoeModel(title);

    // Se encontrou modelo de tênis e não encontrou marca, usa a marca do modelo
    if (modeloInfo && !marca && modeloInfo.brand) {
        marca = modeloInfo.brand;
    }

    // Batch só se aplica a calçados
    let batch = null;
    if (categoria === 'Calçados') {
        batch = extractBatch(title);
        // Se não encontrou batch conhecida, marca como desconhecida
        if (batch === null) {
            batch = 'Batch desconhecida';
        }
    }

    return {
        titulo: title,
        image: product.image || product.product_url,
        product_url: product.product_url,
        preco: extractPrice(title),
        categoria: categoria,
        marca: marca,
        modelo: modeloInfo ? modeloInfo.model : null,
        batch: batch
    };
}

/**
 * Filtra todos os produtos de um resultado de scraping
 */
function filterProducts(scrapingResult) {
    const products = scrapingResult.products || [];
    const vendorUrl = scrapingResult.vendor?.url || '';

    // Extrai nome do vendedor
    let vendorName = null;
    try {
        if (vendorUrl) {
            const urlObj = new URL(vendorUrl);
            vendorName = urlObj.hostname.split('.')[0];
        }
    } catch (e) { console.error('Erro ao extrair nome do vendedor', e); }

    const filteredProducts = products.map(p => {
        const filtered = filterProduct(p, vendorUrl);
        if (vendorName) filtered.vendedor = vendorName;
        return filtered;
    });

    // Estatísticas
    const stats = {
        total: filteredProducts.length,
        com_preco: filteredProducts.filter(p => p.preco !== null).length,
        com_marca: filteredProducts.filter(p => p.marca !== null).length,
        com_modelo: filteredProducts.filter(p => p.modelo !== null).length,
        com_batch: filteredProducts.filter(p => p.batch !== null && p.batch !== 'Batch desconhecida').length,
        por_categoria: {},
        por_modelo: {},
        por_batch: {}
    };

    // Conta por categoria, modelo e batch
    for (const product of filteredProducts) {
        const cat = product.categoria;
        stats.por_categoria[cat] = (stats.por_categoria[cat] || 0) + 1;

        if (product.modelo) {
            stats.por_modelo[product.modelo] = (stats.por_modelo[product.modelo] || 0) + 1;
        }

        if (product.batch) {
            stats.por_batch[product.batch] = (stats.por_batch[product.batch] || 0) + 1;
        }
    }

    // Coleta títulos de produtos sem marca reconhecida ou batch desconhecida
    const marcasNaoEncontradas = [];
    const categoriasDesconhecidas = [];
    const batchesDesconhecidas = [];

    for (const product of filteredProducts) {
        if (product.marca === null) {
            if (!marcasNaoEncontradas.includes(product.titulo)) {
                marcasNaoEncontradas.push(product.titulo);
            }
        }
        if (product.categoria === 'Desconhecido') {
            if (!categoriasDesconhecidas.includes(product.titulo)) {
                categoriasDesconhecidas.push(product.titulo);
            }
        }
        // Coleta calçados com batch desconhecida para debug
        if (product.batch === 'Batch desconhecida') {
            if (!batchesDesconhecidas.includes(product.titulo)) {
                batchesDesconhecidas.push(product.titulo);
            }
        }
    }

    return {
        vendor: scrapingResult.vendor,
        scraped_at: scrapingResult.scraped_at,
        filtered_at: new Date().toISOString(),
        stats,
        debug: {
            marcas_nao_encontradas: marcasNaoEncontradas.slice(0, 100),
            categorias_desconhecidas: categoriasDesconhecidas.slice(0, 100),
            batches_desconhecidas: batchesDesconhecidas.slice(0, 100),
            total_sem_marca: marcasNaoEncontradas.length,
            total_sem_categoria: categoriasDesconhecidas.length,
            total_batch_desconhecida: batchesDesconhecidas.length
        },
        products: filteredProducts
    };
}

/**
 * Limpa os produtos filtrados removendo:
 * - Produtos sem marca (marca === null)
 * - Produtos com categoria "Desconhecido"
 */
function cleanProducts(filteredResult) {
    const products = filteredResult.products || [];

    // Filtra apenas produtos com marca E categoria conhecida
    // E garante que o nome do vendedor esteja presente
    let vendorName = null;
    try {
        if (filteredResult.vendor?.url) {
            vendorName = new URL(filteredResult.vendor.url).hostname.split('.')[0];
        }
    } catch (e) { }

    const cleanedProducts = products
        .filter(p => p.marca !== null && p.categoria !== 'Desconhecido')
        .map(p => {
            if (!p.vendedor && vendorName) {
                return { ...p, vendedor: vendorName };
            }
            return p;
        });

    // Recalcula estatísticas
    const stats = {
        total: cleanedProducts.length,
        removidos: products.length - cleanedProducts.length,
        com_preco: cleanedProducts.filter(p => p.preco !== null).length,
        com_marca: cleanedProducts.length, // Todos têm marca
        com_modelo: cleanedProducts.filter(p => p.modelo !== null).length,
        com_batch: cleanedProducts.filter(p => p.batch !== null && p.batch !== 'Batch desconhecida').length,
        por_categoria: {},
        por_modelo: {},
        por_marca: {},
        por_batch: {}
    };

    // Conta por categoria, modelo, marca e batch
    for (const product of cleanedProducts) {
        const cat = product.categoria;
        stats.por_categoria[cat] = (stats.por_categoria[cat] || 0) + 1;

        if (product.modelo) {
            stats.por_modelo[product.modelo] = (stats.por_modelo[product.modelo] || 0) + 1;
        }

        if (product.marca) {
            stats.por_marca[product.marca] = (stats.por_marca[product.marca] || 0) + 1;
        }

        if (product.batch) {
            stats.por_batch[product.batch] = (stats.por_batch[product.batch] || 0) + 1;
        }
    }

    return {
        vendor: filteredResult.vendor,
        scraped_at: filteredResult.scraped_at,
        filtered_at: filteredResult.filtered_at,
        cleaned_at: new Date().toISOString(),
        stats,
        products: cleanedProducts
    };
}

module.exports = {
    filterProducts,
    filterProduct,
    cleanProducts,
    extractPrice,
    extractBrand,
    extractBatch,
    extractShoeModel,
    detectCategory,
    BRAND_PATTERNS,
    SHOE_MODEL_PATTERNS,
    SHOE_VENDORS,
    BATCH_PATTERNS,
    CATEGORY_KEYWORDS
};
