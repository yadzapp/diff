class CfgPatches
{
	class PackWeight
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class PackWeight
	{
		dir = "PackWeight";
		name = "Pack Weight";
		author = "Lark";
		type = "mod";
		dependencies[] = {"World"};
		class defs
		{
			class worldScriptModule
			{
				value = "";
				files[] = {"PackWeight/scripts/4_World"};
			};
		};
	};
};
