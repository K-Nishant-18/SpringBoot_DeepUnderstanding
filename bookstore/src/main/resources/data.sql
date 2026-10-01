INSERT INTO authors (id, name, bio) VALUES
    (1, 'Joshua Bloch', 'Java language designer and author of Effective Java.'),
    (2, 'Craig Walls', 'Spring framework trainer and author of Spring in Action.'),
    (3, 'Robert C. Martin', 'Author of Clean Code and founder of the Clean Coder community.'),
    (4, 'Michael Nygard', 'Author of Release It and facilitator of architecture decision records.');

INSERT INTO categories (id, name) VALUES
    (1, 'Essays'),
    (2, 'Technical'),
    (3, 'Architecture'),
    (4, 'Databases'),
    (5, 'Operations');

INSERT INTO books (id, title, price, published_year, author_id) VALUES
    (1, 'Effective Java', 49.99, 2017, 1),
    (2, 'Spring in Action', 39.99, 2020, 2),
    (3, 'Clean Code', 34.50, 2008, 3),
    (4, 'Refactoring', 47.00, 2018, 3),
    (5, 'Domain-Driven Design', 44.95, 2003, 3),
    (6, 'Release It!', 39.99, 2018, 4),
    (7, 'Kafka: The Definitive Guide', 29.99, 2021, 4),
    (8, 'Site Reliability Engineering', 55.00, 2016, 4);

INSERT INTO book_categories (book_id, category_id) VALUES
    (1, 2),
    (2, 2),
    (2, 3),
    (3, 2),
    (3, 3),
    (4, 2),
    (4, 3),
    (5, 1),
    (5, 3),
    (6, 2),
    (6, 5),
    (7, 2),
    (7, 4),
    (8, 2),
    (8, 5);

INSERT INTO users (id, email, password, display_name) VALUES
    (1, 'ada@example.com', '$2a$10$notarealhashonlyaseedvalue0000000000000000000', 'Ada Lovelace'),
    (2, 'alan@example.com', '$2a$10$notarealhashonlyaseedvalue0000000000000000000', 'Alan Turing'),
    (3, 'grace@example.com', '$2a$10$notarealhashonlyaseedvalue0000000000000000000', 'Grace Hopper');

INSERT INTO carts (id, user_id) VALUES
    (1, 1),
    (2, 2),
    (3, 3);

INSERT INTO cart_items (id, cart_id, book_id, quantity) VALUES
    (1, 1, 1, 1),
    (2, 1, 7, 2),
    (3, 2, 5, 1),
    (4, 3, 8, 1);

INSERT INTO book_items (id, book_id, status, available, version) VALUES
    (1, 1, 'SOLD', FALSE, 0),
    (2, 1, 'AVAILABLE', TRUE, 0),
    (3, 1, 'AVAILABLE', TRUE, 0),
    (4, 2, 'SOLD', FALSE, 0),
    (5, 2, 'SOLD', FALSE, 0),
    (6, 3, 'SOLD', FALSE, 0),
    (7, 3, 'AVAILABLE', TRUE, 0),
    (8, 3, 'AVAILABLE', TRUE, 0),
    (9, 4, 'SOLD', FALSE, 0),
    (10, 4, 'AVAILABLE', TRUE, 0),
    (11, 5, 'RESERVED', FALSE, 0),
    (12, 6, 'AVAILABLE', TRUE, 0);

INSERT INTO orders (id, user_id, placed_at, status, total, currency) VALUES
    (1, 1, TIMESTAMP '2026-01-14 10:15:00', 'PAID', 84.49, 'EUR'),
    (2, 2, TIMESTAMP '2026-02-02 18:40:00', 'PAID', 126.98, 'EUR'),
    (3, 3, TIMESTAMP '2026-03-11 09:05:00', 'AWAITING_PAYMENT', 44.95, 'EUR');

INSERT INTO order_items (order_id, book_id, book_item_id, quantity, unit_price) VALUES
    (1, 1, 1, 1, 49.99),
    (1, 3, 6, 1, 34.50),
    (2, 2, 4, 2, 39.99),
    (2, 4, 9, 1, 47.00),
    (3, 5, 11, 1, 44.95);

INSERT INTO payments (id, order_id, amount, status, reference, captured_at) VALUES
    (1, 1, 84.49, 'CAPTURED', 'pay-seed-0001', TIMESTAMP '2026-01-14 10:15:03'),
    (2, 2, 126.98, 'CAPTURED', 'pay-seed-0002', TIMESTAMP '2026-02-02 18:40:05');

ALTER TABLE authors ALTER COLUMN id RESTART WITH 100;
ALTER TABLE categories ALTER COLUMN id RESTART WITH 100;
ALTER TABLE books ALTER COLUMN id RESTART WITH 100;
ALTER TABLE users ALTER COLUMN id RESTART WITH 100;
ALTER TABLE carts ALTER COLUMN id RESTART WITH 100;
ALTER TABLE cart_items ALTER COLUMN id RESTART WITH 100;
ALTER TABLE book_items ALTER COLUMN id RESTART WITH 100;
ALTER TABLE orders ALTER COLUMN id RESTART WITH 100;
ALTER TABLE payments ALTER COLUMN id RESTART WITH 100;
ALTER TABLE outbox_events ALTER COLUMN id RESTART WITH 100;
