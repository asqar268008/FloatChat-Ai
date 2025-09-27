class AgroRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'agro_app':
            return 'agro'
        return 'default'

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'agro_app':
            return 'agro'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        db_obj1 = 'agro' if obj1._meta.app_label == 'agro_app' else 'default'
        db_obj2 = 'agro' if obj2._meta.app_label == 'agro_app' else 'default'
        return db_obj1 == db_obj2

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == 'agro_app':
            return db == 'agro'
        return db == 'default'
