-- =====================================================================
-- criar_base_dados.sql
-- Cria a base de dados da HelpMyCar (MySQL 8.4, InnoDB, utf8mb4).
--
-- Convenções:
--   * Chave primária de cada tabela: "cod" (em vez de "id").
--   * Chave estrangeira: "<tabela_no_singular>_cod" (ex.: veiculo_cod).
--   * Nomes de tabelas e campos em português, sem acentos.
--
-- Como correr (no WAMP):  phpMyAdmin > separador SQL > colar este ficheiro > Executar.
-- ATENÇÃO: o script apaga e recria a base de dados "helpmycar" (DROP DATABASE).
-- =====================================================================

DROP DATABASE IF EXISTS helpmycar;
CREATE DATABASE helpmycar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE helpmycar;


-- =====================================================================
-- BLOCO 1: CONTAS E SESSÕES
-- =====================================================================

-- Uma linha por conta de utilizador.
CREATE TABLE utilizadores (
    cod              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome             VARCHAR(100)    NOT NULL,
    email            VARCHAR(255)    NOT NULL,
    password_hash    VARCHAR(255)    NOT NULL,   -- nunca guardar a palavra-passe em texto simples
    data_criacao     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    UNIQUE KEY uq_utilizadores_email (email)
) ENGINE=InnoDB;

-- NOVA: sessões de login. A API devolve um token à app depois do login;
-- aqui guarda-se só o hash do token (SHA-256, 64 caracteres), nunca o token.
CREATE TABLE sessoes (
    cod              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    utilizador_cod   BIGINT UNSIGNED NOT NULL,
    token_hash       CHAR(64)        NOT NULL,
    dispositivo      VARCHAR(100)    NULL,       -- ex.: "Samsung Galaxy A13"
    data_criacao     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_expiracao   DATETIME        NOT NULL,
    PRIMARY KEY (cod),
    UNIQUE KEY uq_sessoes_token_hash (token_hash),
    KEY idx_sessoes_utilizador (utilizador_cod),
    CONSTRAINT fk_sessoes_utilizador
        FOREIGN KEY (utilizador_cod) REFERENCES utilizadores (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- BLOCO 2: VEÍCULOS
-- =====================================================================

CREATE TABLE veiculos (
    cod                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    utilizador_cod      BIGINT UNSIGNED NOT NULL,
    marca               VARCHAR(80)     NOT NULL,
    modelo              VARCHAR(100)    NOT NULL,
    ano                 YEAR            NOT NULL,
    motorizacao         VARCHAR(100)    NULL,
    combustivel         ENUM('gasolina','gasoleo','hibrido','eletrico','gpl','outro') NOT NULL,
    quilometragem_atual INT UNSIGNED    NOT NULL DEFAULT 0,
    matricula           VARCHAR(20)     NULL,
    data_criacao        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    -- a mesma matrícula não pode repetir-se na conta do mesmo utilizador
    -- (várias matrículas NULL são permitidas)
    UNIQUE KEY uq_veiculos_utilizador_matricula (utilizador_cod, matricula),
    CONSTRAINT fk_veiculos_utilizador
        FOREIGN KEY (utilizador_cod) REFERENCES utilizadores (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- BLOCO 3: REGISTOS DO VEÍCULO (manutenções, abastecimentos, despesas)
-- =====================================================================

CREATE TABLE manutencoes (
    cod                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    veiculo_cod           BIGINT UNSIGNED NOT NULL,
    tipo                  VARCHAR(80)     NOT NULL,   -- ex.: "Mudança de óleo"
    descricao             TEXT            NULL,
    data_manutencao       DATE            NOT NULL,
    quilometragem         INT UNSIGNED    NOT NULL,
    custo                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    oficina               VARCHAR(150)    NULL,
    proxima_data          DATE            NULL,
    proxima_quilometragem INT UNSIGNED    NULL,
    data_criacao          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    KEY idx_manutencoes_veiculo_data (veiculo_cod, data_manutencao),
    CONSTRAINT fk_manutencoes_veiculo
        FOREIGN KEY (veiculo_cod) REFERENCES veiculos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE abastecimentos (
    cod                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    veiculo_cod        BIGINT UNSIGNED NOT NULL,
    data_abastecimento DATETIME        NOT NULL,
    litros             DECIMAL(8,3)    NOT NULL,
    preco_por_litro    DECIMAL(8,3)    NOT NULL,
    custo_total        DECIMAL(10,2)   NOT NULL,
    quilometragem      INT UNSIGNED    NOT NULL,
    deposito_cheio     BOOLEAN         NOT NULL DEFAULT TRUE,   -- necessário para calcular o consumo
    data_criacao       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    KEY idx_abastecimentos_veiculo_data (veiculo_cod, data_abastecimento),
    CONSTRAINT fk_abastecimentos_veiculo
        FOREIGN KEY (veiculo_cod) REFERENCES veiculos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Categorias partilhadas por todos os utilizadores (seguro, portagens, ...).
CREATE TABLE categorias_despesas (
    cod       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome      VARCHAR(80)     NOT NULL,
    descricao VARCHAR(255)    NULL,
    PRIMARY KEY (cod),
    UNIQUE KEY uq_categorias_despesas_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE despesas (
    cod           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    veiculo_cod   BIGINT UNSIGNED NOT NULL,
    categoria_cod BIGINT UNSIGNED NOT NULL,
    descricao     VARCHAR(255)    NOT NULL,
    valor         DECIMAL(10,2)   NOT NULL,
    data_despesa  DATE            NOT NULL,
    fornecedor    VARCHAR(150)    NULL,
    observacoes   TEXT            NULL,
    data_criacao  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    KEY idx_despesas_veiculo_data (veiculo_cod, data_despesa),
    KEY idx_despesas_categoria (categoria_cod),
    CONSTRAINT fk_despesas_veiculo
        FOREIGN KEY (veiculo_cod) REFERENCES veiculos (cod)
        ON DELETE CASCADE,
    -- RESTRICT: não deixa apagar uma categoria que ainda tem despesas
    CONSTRAINT fk_despesas_categoria
        FOREIGN KEY (categoria_cod) REFERENCES categorias_despesas (cod)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =====================================================================
-- BLOCO 4: LEMBRETES E VIAGENS
-- =====================================================================

CREATE TABLE lembretes (
    cod                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    veiculo_cod            BIGINT UNSIGNED NOT NULL,
    titulo                 VARCHAR(120)    NOT NULL,
    descricao              TEXT            NULL,
    data_prevista          DATE            NULL,
    quilometragem_prevista INT UNSIGNED    NULL,
    estado                 ENUM('pendente','concluido') NOT NULL DEFAULT 'pendente',
    data_criacao           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    KEY idx_lembretes_veiculo_estado (veiculo_cod, estado),
    CONSTRAINT fk_lembretes_veiculo
        FOREIGN KEY (veiculo_cod) REFERENCES veiculos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE viagens (
    cod               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    veiculo_cod       BIGINT UNSIGNED NOT NULL,
    inicio            DATETIME        NOT NULL,
    fim               DATETIME        NULL,
    origem            VARCHAR(255)    NULL,
    destino           VARCHAR(255)    NULL,
    distancia_km      DECIMAL(10,2)   NULL,
    duracao_minutos   INT UNSIGNED    NULL,
    consumo_estimado  DECIMAL(8,3)    NULL,
    data_criacao      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- novo: igual às outras tabelas
    PRIMARY KEY (cod),
    KEY idx_viagens_veiculo_inicio (veiculo_cod, inicio),
    CONSTRAINT fk_viagens_veiculo
        FOREIGN KEY (veiculo_cod) REFERENCES veiculos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- BLOCO 5: DIAGNÓSTICO OBD-II
-- =====================================================================

-- NOVA: catálogo com a explicação de cada código de avaria (P0420, ...).
-- É a base da ideia central da app: explicar os códigos de forma simples.
-- Preenche-se uma vez e serve para todos os utilizadores.
CREATE TABLE catalogo_codigos_erro (
    cod              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo           VARCHAR(20)     NOT NULL,   -- ex.: "P0420"
    titulo           VARCHAR(180)    NOT NULL,   -- nome curto do problema
    explicacao       TEXT            NOT NULL,   -- explicação em linguagem simples
    possiveis_causas TEXT            NULL,
    o_que_fazer      TEXT            NULL,
    gravidade        ENUM('baixa','media','alta') NOT NULL DEFAULT 'media',
    PRIMARY KEY (cod),
    UNIQUE KEY uq_catalogo_codigo (codigo)
) ENGINE=InnoDB;

-- Uma sessão de leitura/diagnóstico feita ao veículo.
CREATE TABLE diagnosticos (
    cod               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    veiculo_cod       BIGINT UNSIGNED NOT NULL,
    data_diagnostico  DATETIME        NOT NULL,
    tipo              VARCHAR(50)     NOT NULL,
    estado            ENUM('concluido','com_erro') NOT NULL,
    resumo            TEXT            NULL,
    origem            ENUM('obd2','manual') NOT NULL,
    data_criacao      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    KEY idx_diagnosticos_veiculo_data (veiculo_cod, data_diagnostico),
    CONSTRAINT fk_diagnosticos_veiculo
        FOREIGN KEY (veiculo_cod) REFERENCES veiculos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Códigos de avaria encontrados num diagnóstico.
-- catalogo_cod liga ao catálogo; fica NULL se o código ainda não estiver catalogado.
CREATE TABLE codigos_erro (
    cod             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    diagnostico_cod BIGINT UNSIGNED NOT NULL,
    catalogo_cod    BIGINT UNSIGNED NULL,
    codigo          VARCHAR(20)     NOT NULL,
    descricao       TEXT            NULL,
    estado          VARCHAR(30)     NULL,
    resolvido       BOOLEAN         NOT NULL DEFAULT FALSE,
    PRIMARY KEY (cod),
    KEY idx_codigos_erro_diagnostico (diagnostico_cod),
    KEY idx_codigos_erro_codigo (codigo),
    CONSTRAINT fk_codigos_erro_diagnostico
        FOREIGN KEY (diagnostico_cod) REFERENCES diagnosticos (cod)
        ON DELETE CASCADE,
    -- SET NULL: se um item do catálogo for apagado, o código lido mantém-se
    CONSTRAINT fk_codigos_erro_catalogo
        FOREIGN KEY (catalogo_cod) REFERENCES catalogo_codigos_erro (cod)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- Parâmetros lidos pelo OBD-II (RPM, temperatura, velocidade, ...).
-- Pode crescer muito: guardar só o necessário.
CREATE TABLE leituras_obd (
    cod             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    diagnostico_cod BIGINT UNSIGNED NOT NULL,
    parametro       VARCHAR(80)     NOT NULL,
    valor           DECIMAL(12,3)   NOT NULL,
    unidade         VARCHAR(20)     NULL,
    data_leitura    DATETIME        NOT NULL,
    PRIMARY KEY (cod),
    KEY idx_leituras_obd_diagnostico (diagnostico_cod, data_leitura),
    CONSTRAINT fk_leituras_obd_diagnostico
        FOREIGN KEY (diagnostico_cod) REFERENCES diagnosticos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- BLOCO 6: CONTEÚDOS EDUCATIVOS (Dúvidas e vídeos)
-- =====================================================================

CREATE TABLE videos_educativos (
    cod              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    titulo           VARCHAR(180)    NOT NULL,
    descricao        TEXT            NULL,
    categoria        VARCHAR(80)     NOT NULL,
    url_video        VARCHAR(500)    NOT NULL,
    url_miniatura    VARCHAR(500)    NULL,
    duracao_segundos INT UNSIGNED    NULL,
    publicado        BOOLEAN         NOT NULL DEFAULT FALSE,
    data_criacao     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    KEY idx_videos_categoria (categoria, publicado)
) ENGINE=InnoDB;

-- Liga utilizadores aos vídeos que guardaram como favoritos (N para N).
CREATE TABLE favoritos_videos (
    cod            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    utilizador_cod BIGINT UNSIGNED NOT NULL,
    video_cod      BIGINT UNSIGNED NOT NULL,
    data_criacao   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod),
    -- impede guardar o mesmo vídeo duas vezes
    UNIQUE KEY uq_favoritos_utilizador_video (utilizador_cod, video_cod),
    KEY idx_favoritos_video (video_cod),
    CONSTRAINT fk_favoritos_utilizador
        FOREIGN KEY (utilizador_cod) REFERENCES utilizadores (cod)
        ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_video
        FOREIGN KEY (video_cod) REFERENCES videos_educativos (cod)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- BLOCO 7: DADOS INICIAIS
-- Categorias de despesas que existem desde o primeiro dia.
-- =====================================================================

INSERT INTO categorias_despesas (nome, descricao) VALUES
    ('Combustível',  'Gasolina, gasóleo, GPL ou carregamento elétrico'),
    ('Seguro',       'Prémios de seguro automóvel'),
    ('Reparação',    'Reparações e peças'),
    ('Inspeção',     'Inspeção periódica obrigatória'),
    ('Impostos',     'Imposto Único de Circulação (IUC) e outros'),
    ('Portagens',    'Portagens e vias'),
    ('Estacionamento', 'Parques e estacionamento na rua'),
    ('Lavagem',      'Lavagem e limpeza'),
    ('Acessórios',   'Acessórios e equipamento'),
    ('Outros',       'Despesas que não encaixam nas outras categorias');
